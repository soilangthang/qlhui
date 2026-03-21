import type { HuiMemberRef } from "@/lib/hui-member-line-metrics";
import { openingWinnerMatchesMember, participantMatchesMember } from "@/lib/hui-member-line-metrics";
import { memberTrackingKeyFromLeg, parseMemberIdFromNote } from "@/lib/member-tracking-key";
import { prisma } from "@/lib/prisma";

export type TheoDoiLeg = {
  stt: number;
  memberName: string | null;
  memberPhone: string | null;
  note: string | null;
};

/** Khóa member của người hốt (kỳ hiện tại). */
export function winnerMemberKeyForOpening(
  legs: TheoDoiLeg[],
  winnerLegStt: number,
  winnerName: string,
  winnerPhone: string | null,
): string | null {
  if (winnerLegStt > 0) {
    const leg = legs.find((l) => l.stt === winnerLegStt);
    if (leg) return memberTrackingKeyFromLeg(leg);
  }
  const ref: HuiMemberRef = { id: "", name: winnerName, phone: winnerPhone ?? "" };
  for (const leg of legs) {
    const p = {
      legStt: leg.stt,
      memberId: parseMemberIdFromNote(leg.note),
      memberName: leg.memberName,
      memberPhone: leg.memberPhone,
    };
    if (participantMatchesMember(p, ref)) {
      return memberTrackingKeyFromLeg(leg);
    }
  }
  for (const leg of legs) {
    const member: HuiMemberRef = {
      id: parseMemberIdFromNote(leg.note) ?? "",
      name: leg.memberName ?? "",
      phone: leg.memberPhone ?? "",
    };
    if (openingWinnerMatchesMember(winnerName, winnerPhone, member)) {
      return memberTrackingKeyFromLeg(leg);
    }
  }
  return null;
}

/** Các memberKey cần đánh dấu đóng tiền (không gồm người hốt). */
export function nonWinnerMemberKeys(legs: TheoDoiLeg[], winnerKey: string | null): string[] {
  const keys = new Set<string>();
  for (const leg of legs) {
    const k = memberTrackingKeyFromLeg(leg);
    if (!k) continue;
    if (winnerKey && k === winnerKey) continue;
    keys.add(k);
  }
  return [...keys];
}

export async function getWinnerMemberKeyForOpeningId(openingId: string): Promise<string | null> {
  const opening = await prisma.huiOpening.findUnique({
    where: { id: openingId },
    select: {
      huiLineId: true,
      winnerLegStt: true,
      winnerName: true,
      winnerPhone: true,
    },
  });
  if (!opening) return null;
  const legs = await prisma.huiLeg.findMany({
    where: { huiLineId: opening.huiLineId },
    select: { stt: true, memberName: true, memberPhone: true, note: true },
  });
  return winnerMemberKeyForOpening(
    legs,
    opening.winnerLegStt,
    opening.winnerName,
    opening.winnerPhone,
  );
}

/** Khi chủ xác nhận đã giao tiền ở Thu tiền: tích hết đánh dấu đóng đủ cho các hụi viên không phải người hốt. */
export async function syncPaidMarksWhenOpeningDelivered(openingId: string): Promise<void> {
  const opening = await prisma.huiOpening.findUnique({
    where: { id: openingId },
    select: {
      id: true,
      huiLineId: true,
      winnerLegStt: true,
      winnerName: true,
      winnerPhone: true,
    },
  });
  if (!opening) return;

  const legs = await prisma.huiLeg.findMany({
    where: { huiLineId: opening.huiLineId },
    select: { stt: true, memberName: true, memberPhone: true, note: true },
  });

  const wKey = winnerMemberKeyForOpening(
    legs,
    opening.winnerLegStt,
    opening.winnerName,
    opening.winnerPhone,
  );
  const keys = nonWinnerMemberKeys(legs, wKey);

  for (const memberKey of keys) {
    await prisma.huiOpeningMemberPaidMark.upsert({
      where: {
        huiOpeningId_memberKey: { huiOpeningId: openingId, memberKey },
      },
      create: { huiOpeningId: openingId, memberKey, paidFull: true },
      update: { paidFull: true },
    });
  }
}

/**
 * Nếu mọi hụi viên (không tính người hốt) đã đánh dấu đóng đủ → tự đặt kỳ thành Đã giao tiền (giống nút Thu tiền).
 */
export async function tryCompleteOpeningWhenAllNonWinnersPaid(
  openingId: string,
): Promise<{ completed: boolean; status: string }> {
  const opening = await prisma.huiOpening.findUnique({
    where: { id: openingId },
    select: {
      id: true,
      status: true,
      huiLineId: true,
      winnerLegStt: true,
      winnerName: true,
      winnerPhone: true,
    },
  });
  if (!opening) {
    return { completed: false, status: "UNKNOWN" };
  }
  if (opening.status !== "CHO_GIAO_TIEN") {
    return { completed: false, status: opening.status };
  }

  const legs = await prisma.huiLeg.findMany({
    where: { huiLineId: opening.huiLineId },
    select: { stt: true, memberName: true, memberPhone: true, note: true },
  });

  const wKey = winnerMemberKeyForOpening(
    legs,
    opening.winnerLegStt,
    opening.winnerName,
    opening.winnerPhone,
  );
  if (wKey == null) {
    return { completed: false, status: opening.status };
  }
  const nonWin = nonWinnerMemberKeys(legs, wKey);

  if (nonWin.length === 0) {
    await prisma.huiOpening.update({
      where: { id: openingId },
      data: { status: "DA_GIAO_TIEN" },
    });
    return { completed: true, status: "DA_GIAO_TIEN" };
  }

  const marks = await prisma.huiOpeningMemberPaidMark.findMany({
    where: { huiOpeningId: openingId, memberKey: { in: nonWin } },
    select: { memberKey: true, paidFull: true },
  });
  const paid = new Map(marks.map((m) => [m.memberKey, m.paidFull]));
  for (const k of nonWin) {
    if (!paid.get(k)) {
      return { completed: false, status: "CHO_GIAO_TIEN" };
    }
  }

  await prisma.huiOpening.update({
    where: { id: openingId },
    data: { status: "DA_GIAO_TIEN" },
  });
  return { completed: true, status: "DA_GIAO_TIEN" };
}
