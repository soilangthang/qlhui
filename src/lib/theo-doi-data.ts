import {
  isMemberWinnerOnRow,
  rowPayInPayOut,
  type HuiLineDetailRow,
  type HuiMemberRef,
} from "@/lib/hui-member-line-metrics";
import { memberTrackingKeyFromLeg, parseMemberIdFromNote } from "@/lib/member-tracking-key";
import { prisma } from "@/lib/prisma";

type PaidMarkRow = { huiOpeningId: string; memberKey: string; paidFull: boolean };

async function loadMarksForOpenings(openingIds: string[]): Promise<PaidMarkRow[]> {
  if (openingIds.length === 0) return [];
  try {
    return await prisma.huiOpeningMemberPaidMark.findMany({
      where: { huiOpeningId: { in: openingIds } },
      select: { huiOpeningId: true, memberKey: true, paidFull: true },
    });
  } catch (e) {
    console.error("[theo-doi] Không đọc được bảng đánh dấu:", e);
    return [];
  }
}

export type TheoDoiLinePayload = {
  lineId: string;
  lineName: string;
  soChan: number;
  mucHuiThang: number;
  /** Tiền cò theo dây (mỗi chân mỗi kỳ), VNĐ. */
  tienCo: number;
  /** Giá thăm kỳ khui mới nhất (HuiOpening.bidAmount); null nếu chưa có kỳ. */
  giaThamKyNay: number | null;
  latestOpening: null | {
    id: string;
    kyThu: number;
    ngayKhui: string;
    status: string;
  };
  groups: {
    memberKey: string;
    memberName: string;
    memberPhone: string;
    slotCount: number;
    legStts: number[];
    /** Tiền phải đóng cho kỳ khui mới nhất (0 nếu người hốt — trừ ngang). null nếu chưa có kỳ. */
    tienDongKyNay: number | null;
    laNguoiHotKyNay: boolean;
  }[];
  paidByMemberKey: Record<string, boolean>;
};

function memberRefFromGroup(g: {
  memberKey: string;
  memberName: string;
  memberPhone: string;
}): HuiMemberRef {
  const name = (g.memberName ?? "").trim() || "—";
  const phone = (g.memberPhone ?? "").trim() || "";
  if (g.memberKey.startsWith("id:")) {
    return { id: g.memberKey.slice(3), name, phone };
  }
  return { id: g.memberKey, name, phone };
}

export async function loadTheoDoiData(userId: string): Promise<TheoDoiLinePayload[]> {
  const lines = await prisma.huiLine.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      soChan: true,
      mucHuiThang: true,
      tienCo: true,
      chuKy: true,
      ngayMo: true,
      legs: { select: { stt: true, memberName: true, memberPhone: true, note: true } },
      openings: {
        orderBy: { kyThu: "asc" },
        select: {
          id: true,
          kyThu: true,
          ngayKhui: true,
          status: true,
          bidAmount: true,
          contributionPerSlot: true,
          grossPayout: true,
          finalPayout: true,
          winnerName: true,
          winnerPhone: true,
          winnerLegStt: true,
          winnerSlots: true,
        },
      },
    },
  });

  const openingIds = lines
    .map((l) => (l.openings.length > 0 ? l.openings[l.openings.length - 1]?.id : undefined))
    .filter((id): id is string => Boolean(id));
  const marks = await loadMarksForOpenings(openingIds);

  const markMap = new Map<string, boolean>();
  for (const m of marks) {
    markMap.set(`${m.huiOpeningId}\t${m.memberKey}`, m.paidFull);
  }

  return lines.map((line) => {
    const openingsAsc = line.openings ?? [];
    const latest = openingsAsc.length > 0 ? openingsAsc[openingsAsc.length - 1]! : null;
    const groupMap = new Map<
      string,
      { memberKey: string; memberName: string; memberPhone: string; slotCount: number; legStts: number[] }
    >();

    for (const leg of line.legs) {
      const key = memberTrackingKeyFromLeg(leg);
      if (!key) continue;
      const cur = groupMap.get(key);
      if (cur) {
        cur.slotCount += 1;
        cur.legStts.push(leg.stt);
      } else {
        groupMap.set(key, {
          memberKey: key,
          memberName: (leg.memberName ?? "").trim() || "—",
          memberPhone: (leg.memberPhone ?? "").trim() || "—",
          slotCount: 1,
          legStts: [leg.stt],
        });
      }
    }

    const participants = line.legs.map((leg) => ({
      legStt: leg.stt,
      memberId: parseMemberIdFromNote(leg.note),
      memberName: leg.memberName,
      memberPhone: leg.memberPhone,
    }));

    const rowDetail: HuiLineDetailRow = {
      lineId: line.id,
      lineName: line.name,
      lineAmount: Number(line.mucHuiThang),
      lineTienCo: Math.max(0, Math.round(Number(line.tienCo ?? 0))),
      ngayMo: line.ngayMo.toISOString(),
      chuKy: line.chuKy,
      totalCycles: line.soChan,
      latestKy: latest?.kyThu ?? null,
      latestDate: latest?.ngayKhui.toISOString() ?? null,
      latestOpeningStatus: latest
        ? latest.status === "DA_GIAO_TIEN"
          ? "DA_GIAO_TIEN"
          : "CHO_GIAO_TIEN"
        : null,
      latestBidAmount: latest?.bidAmount ?? 0,
      latestContributionPerSlot: latest?.contributionPerSlot ?? 0,
      latestGrossPayout: latest?.grossPayout ?? 0,
      latestFinalPayout: latest?.finalPayout ?? 0,
      latestWinnerName: latest?.winnerName ?? null,
      latestWinnerPhone: latest?.winnerPhone ?? null,
      latestWinnerLegStt: latest?.winnerLegStt ?? null,
      latestWinnerSlots: latest?.winnerSlots ?? 1,
      participants,
      openings: openingsAsc.map((o) => ({
        kyThu: o.kyThu,
        ngayKhui: o.ngayKhui.toISOString(),
        status: o.status === "DA_GIAO_TIEN" ? "DA_GIAO_TIEN" : "CHO_GIAO_TIEN",
        contributionPerSlot: o.contributionPerSlot,
        grossPayout: o.grossPayout,
        finalPayout: o.finalPayout,
        winnerName: o.winnerName,
        winnerPhone: o.winnerPhone,
        winnerLegStt: o.winnerLegStt,
        winnerSlots: o.winnerSlots,
        bidAmount: o.bidAmount,
      })),
    };

    const groups = Array.from(groupMap.values()).map((g) => {
      const sorted = { ...g, legStts: [...g.legStts].sort((a, b) => a - b) };
      const member = memberRefFromGroup(sorted);
      const rowWithSlots = { ...rowDetail, memberSlots: sorted.slotCount };
      const { payIn } = rowPayInPayOut(rowWithSlots, member);
      const laNguoiHotKyNay = latest ? isMemberWinnerOnRow(rowDetail, member) : false;
      return {
        ...sorted,
        tienDongKyNay: latest ? payIn : null,
        laNguoiHotKyNay,
      };
    });

    const paidByMemberKey: Record<string, boolean> = {};
    if (latest) {
      for (const g of groups) {
        paidByMemberKey[g.memberKey] = markMap.get(`${latest.id}\t${g.memberKey}`) ?? false;
      }
    }

    return {
      lineId: line.id,
      lineName: line.name,
      soChan: line.soChan,
      mucHuiThang: Number(line.mucHuiThang),
      tienCo: Math.max(0, Math.round(Number(line.tienCo ?? 0))),
      giaThamKyNay: latest != null ? latest.bidAmount : null,
      latestOpening: latest
        ? {
            id: latest.id,
            kyThu: latest.kyThu,
            ngayKhui: latest.ngayKhui.toISOString(),
            status: latest.status,
          }
        : null,
      groups,
      paidByMemberKey,
    };
  });
}
