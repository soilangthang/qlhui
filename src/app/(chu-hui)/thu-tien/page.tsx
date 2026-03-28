import { unstable_cache } from "next/cache";

import ThuTienTable from "@/components/thu-tien-table";
import { assertChuHuiUserId } from "@/lib/chu-hui-scope";
import {
  deadSlotsOnRowForMember,
  deadContributionPerCollectionVND,
  isMemberWinnerOnRow,
  liveContributionPerCollectionVND,
  latestCollectedTargetVND,
  latestDeliveryAmountVND,
  type HuiLineDetailRow,
  type HuiMemberRef,
  type HuiOpeningForMetrics,
} from "@/lib/hui-member-line-metrics";
import { memberTrackingKeyFromLeg } from "@/lib/member-tracking-key";
import { parseMemberIdFromNote } from "@/lib/member-tracking-key";
import { logPerf, perfNowMs } from "@/lib/perf-log";
import { prisma } from "@/lib/prisma";

type ThuTienRowPayload = {
  id: string;
  huiLineId: string;
  huiLineName: string;
  huiLineKind: "THUONG" | "GOP";
  huiLineGopCycleDays: number | null;
  kyThu: number;
  ngayKhui: string;
  collectedNowAmount: number;
  amountToCollect: number;
  amountToDeliver: number;
  status: "CHO_GIAO_TIEN" | "DA_GIAO_TIEN";
  isCollectedComplete: boolean;
};

type PaidMarkRow = { huiOpeningId: string; memberKey: string; paidFull: boolean };

async function loadMarksForOpenings(openingIds: string[]): Promise<PaidMarkRow[]> {
  if (openingIds.length === 0) return [];
  try {
    return await prisma.huiOpeningMemberPaidMark.findMany({
      where: { huiOpeningId: { in: openingIds } },
      select: { huiOpeningId: true, memberKey: true, paidFull: true },
    });
  } catch (e) {
    console.error("[thu-tien/page] Khong doc duoc bang danh dau:", e);
    return [];
  }
}

function markedCollectedAmountForOpening(
  row: HuiLineDetailRow,
  openingId: string,
  marksByOpeningAndMemberKey: Map<string, boolean>,
  legs: { stt: number; memberName: string | null; memberPhone: string | null; note: string | null }[],
) {
  const groups = new Map<
    string,
    { memberKey: string; memberName: string; memberPhone: string; slotCount: number }
  >();

  for (const leg of legs) {
    const memberKey = memberTrackingKeyFromLeg(leg);
    if (!memberKey) continue;
    const current = groups.get(memberKey);
    if (current) {
      current.slotCount += 1;
      continue;
    }
    groups.set(memberKey, {
      memberKey,
      memberName: (leg.memberName ?? "").trim(),
      memberPhone: (leg.memberPhone ?? "").trim(),
      slotCount: 1,
    });
  }

  let total = 0;
  for (const group of groups.values()) {
    if (!marksByOpeningAndMemberKey.get(`${openingId}\t${group.memberKey}`)) continue;
    const member: HuiMemberRef = {
      id: group.memberKey.startsWith("id:") ? group.memberKey.slice(3) : group.memberKey,
      name: group.memberName,
      phone: group.memberPhone,
    };
    const rowWithSlots = { ...row, memberSlots: group.slotCount };
    if (isMemberWinnerOnRow(rowWithSlots, member)) continue;
    const deadSlots = deadSlotsOnRowForMember(rowWithSlots, member);
    const liveSlots = Math.max(0, group.slotCount - deadSlots);
    total += liveContributionPerCollectionVND(row) * liveSlots + deadContributionPerCollectionVND(row) * deadSlots;
  }

  return total;
}

function winnerMemberKeyForOpening(
  legs: { stt: number; memberName: string | null; memberPhone: string | null; note: string | null }[],
  winnerLegStt: number | null,
  winnerName: string | null,
  winnerPhone: string | null,
) {
  if (winnerLegStt != null && winnerLegStt > 0) {
    const leg = legs.find((item) => item.stt === winnerLegStt);
    if (leg) return memberTrackingKeyFromLeg(leg);
  }

  const normalizedWinnerName = (winnerName ?? "").trim().toLowerCase();
  const normalizedWinnerPhone = (winnerPhone ?? "").replace(/\D/g, "");
  for (const leg of legs) {
    const name = (leg.memberName ?? "").trim().toLowerCase();
    const phone = (leg.memberPhone ?? "").replace(/\D/g, "");
    if (name === normalizedWinnerName && phone === normalizedWinnerPhone) {
      return memberTrackingKeyFromLeg(leg);
    }
  }
  return null;
}

function isOpeningCollectedComplete(
  openingId: string,
  winnerKey: string | null,
  legs: { stt: number; memberName: string | null; memberPhone: string | null; note: string | null }[],
  marksByOpeningAndMemberKey: Map<string, boolean>,
) {
  const groupKeys = new Set<string>();
  for (const leg of legs) {
    const memberKey = memberTrackingKeyFromLeg(leg);
    if (!memberKey) continue;
    if (winnerKey && memberKey === winnerKey) continue;
    groupKeys.add(memberKey);
  }
  if (groupKeys.size === 0) return false;
  for (const key of groupKeys) {
    if (!marksByOpeningAndMemberKey.get(`${openingId}\t${key}`)) return false;
  }
  return true;
}

const loadThuTienRowsCached = unstable_cache(
  async (userId: string): Promise<ThuTienRowPayload[]> => {
    const baseSelect = {
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
      huiLine: {
        select: {
          id: true,
          name: true,
          kind: true,
          gopCycleDays: true,
          soChan: true,
          mucHuiThang: true,
          tienCo: true,
          chuKy: true,
          ngayMo: true,
          legs: {
            select: { stt: true, memberName: true, memberPhone: true, note: true },
          },
        },
      },
    } as const;

    const [pendingOpenings, completedOpenings] = await Promise.all([
      prisma.huiOpening.findMany({
        where: {
          status: "CHO_GIAO_TIEN",
          huiLine: { userId },
        },
        orderBy: [{ ngayKhui: "desc" }, { kyThu: "desc" }],
        take: 300,
        select: baseSelect,
      }),
      prisma.huiOpening.findMany({
        where: {
          status: "DA_GIAO_TIEN",
          huiLine: { userId },
        },
        orderBy: [{ ngayKhui: "desc" }, { kyThu: "desc" }],
        take: 120,
        select: baseSelect,
      }),
    ]);

    const allOpenings = [...pendingOpenings, ...completedOpenings];
    const openingsByLineId = new Map<string, typeof allOpenings>();
    for (const opening of allOpenings) {
      const bucket = openingsByLineId.get(opening.huiLine.id);
      if (bucket) bucket.push(opening);
      else openingsByLineId.set(opening.huiLine.id, [opening]);
    }
    for (const bucket of openingsByLineId.values()) {
      bucket.sort((a, b) => a.kyThu - b.kyThu);
    }

    const rowsSource = [...allOpenings].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "CHO_GIAO_TIEN" ? -1 : 1;
      }
      const dateDiff = b.ngayKhui.getTime() - a.ngayKhui.getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.kyThu - a.kyThu;
    });

    const marks = await loadMarksForOpenings(rowsSource.map((opening) => opening.id));
    const marksByOpeningAndMemberKey = new Map<string, boolean>();
    for (const mark of marks) {
      marksByOpeningAndMemberKey.set(`${mark.huiOpeningId}\t${mark.memberKey}`, mark.paidFull);
    }

    return rowsSource.map((item) => {
      const openingsForThisRow = (openingsByLineId.get(item.huiLine.id) ?? []).filter(
        (opening) => opening.kyThu <= item.kyThu,
      );
      const rowDetail: HuiLineDetailRow = {
        lineId: item.huiLine.id,
        lineName: item.huiLine.name,
        lineKind: item.huiLine.kind,
        lineAmount: Number(item.huiLine.mucHuiThang),
        contributionDays: item.huiLine.kind === "GOP" ? Math.max(1, item.huiLine.gopCycleDays ?? 1) : 1,
        lineTienCo: Math.max(0, Math.round(Number(item.huiLine.tienCo ?? 0))),
        ngayMo: item.huiLine.ngayMo.toISOString(),
        chuKy: item.huiLine.chuKy,
        totalCycles: item.huiLine.soChan,
        latestKy: item.kyThu,
        latestDate: item.ngayKhui.toISOString(),
        latestOpeningStatus: item.status,
        latestBidAmount: item.bidAmount,
        latestContributionPerSlot: item.contributionPerSlot,
        latestGrossPayout: item.grossPayout,
        latestFinalPayout: item.finalPayout,
        latestWinnerName: item.winnerName,
        latestWinnerPhone: item.winnerPhone,
        latestWinnerLegStt: item.winnerLegStt,
        latestWinnerSlots: item.winnerSlots,
        latestMarkedCollectedAmount: 0,
        openings: openingsForThisRow.map(
          (opening): HuiOpeningForMetrics => ({
            kyThu: opening.kyThu,
            status: opening.status,
            contributionPerSlot: opening.contributionPerSlot,
            winnerName: opening.winnerName,
            winnerPhone: opening.winnerPhone,
            winnerLegStt: opening.winnerLegStt,
            winnerSlots: opening.winnerSlots,
          }),
        ),
        participants: item.huiLine.legs.map((leg) => ({
          legStt: leg.stt,
          memberId: parseMemberIdFromNote(leg.note),
          memberName: leg.memberName,
          memberPhone: leg.memberPhone,
        })),
      };
      rowDetail.latestMarkedCollectedAmount = markedCollectedAmountForOpening(
        rowDetail,
        item.id,
        marksByOpeningAndMemberKey,
        item.huiLine.legs,
      );
      const collectedNowAmount =
        (rowDetail.latestMarkedCollectedAmount ?? 0) > 0 || item.status !== "DA_GIAO_TIEN"
          ? (rowDetail.latestMarkedCollectedAmount ?? 0)
          : latestCollectedTargetVND(rowDetail);
      const winnerKey = winnerMemberKeyForOpening(
        item.huiLine.legs,
        item.winnerLegStt,
        item.winnerName,
        item.winnerPhone,
      );
      const isCollectedComplete =
        item.huiLine.kind === "GOP"
          ? isOpeningCollectedComplete(item.id, winnerKey, item.huiLine.legs, marksByOpeningAndMemberKey)
          : item.status === "DA_GIAO_TIEN";

      return {
        id: item.id,
        huiLineId: item.huiLine.id,
        huiLineName: item.huiLine.name,
        huiLineKind: item.huiLine.kind,
        huiLineGopCycleDays: item.huiLine.gopCycleDays,
        kyThu: item.kyThu,
        ngayKhui: item.ngayKhui.toISOString(),
        collectedNowAmount,
        amountToCollect: latestCollectedTargetVND(rowDetail),
        amountToDeliver: latestDeliveryAmountVND(rowDetail),
        status: item.status,
        isCollectedComplete,
      };
    });
  },
  ["thu-tien-page-data-v6"],
  { revalidate: 60, tags: ["thu-tien-panel-data"] },
);

export default async function ThuTienPage() {
  const t0 = perfNowMs();
  const userId = await assertChuHuiUserId();
  const rows = await loadThuTienRowsCached(userId);
  const openings = rows.filter((row) => row.status === "CHO_GIAO_TIEN");
  logPerf("thu-tien-page-fresh", t0, `userId=${userId} choRows=${openings.length} rows=${rows.length}`);

  return (
    <section className="min-h-[calc(100vh-140px)] rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Thu tiền</h2>
      <p className="mt-1 text-sm text-slate-600">
        {rows.length > 0
          ? "Danh sách kỳ đang chờ giao tiền và lịch sử các kỳ đã thu gần đây"
          : "Hiện chưa có kỳ nào trong danh sách thu tiền"}
      </p>

      <div className="mt-4">
        <ThuTienTable initialRows={rows} />
      </div>
    </section>
  );
}
