/**
 * Bảng tiền trên phiếu giao hụi (kỳ khui): tách chân chết (đóng đủ mức dây) và chân sống (đóng sau thăm).
 * Khớp công thức lúc khui: gross = dead×mứcDây + live×(mứcDây − thăm).
 */

export type PhieuGiaoBreakdownInput = {
  totalSlots: number;
  winnerSlots: number;
  lineAmount: number;
  bidAmount: number;
  contributionPerSlot: number;
  grossPayout: number;
};

export type PhieuGiaoBreakdown = {
  contributors: number;
  deadCount: number;
  liveCount: number;
  deadTotal: number;
  liveTotal: number;
};

export function computePhieuGiaoBreakdown(input: PhieuGiaoBreakdownInput): PhieuGiaoBreakdown {
  const M = Math.max(0, Math.round(input.lineAmount));
  const B = Math.max(0, Math.round(input.bidAmount));
  const c = Math.max(0, Math.round(input.contributionPerSlot));
  const G = Math.max(0, Math.round(input.grossPayout));
  const W = Math.max(0, Math.trunc(input.winnerSlots));
  const T = Math.max(0, Math.trunc(input.totalSlots));
  const contributors = Math.max(0, T - W);

  if (contributors === 0) {
    return { contributors: 0, deadCount: 0, liveCount: 0, deadTotal: 0, liveTotal: 0 };
  }

  if (B === 0 || c >= M) {
    const liveTotal = contributors * M;
    return {
      contributors,
      deadCount: 0,
      liveCount: contributors,
      deadTotal: 0,
      liveTotal,
    };
  }

  const rawLive = (contributors * M - G) / B;
  let liveCount = Number.isFinite(rawLive) ? Math.round(rawLive) : 0;
  liveCount = Math.max(0, Math.min(contributors, liveCount));
  const deadCount = contributors - liveCount;
  const deadTotal = deadCount * M;
  const liveTotal = liveCount * c;

  return { contributors, deadCount, liveCount, deadTotal, liveTotal };
}

/** Số kỳ còn lại trên dây sau kỳ hốt này (đếm mãn dây). */
export function kyConLaiSauHoot(totalCycles: number, kyThu: number): number {
  return Math.max(0, Math.trunc(totalCycles) - Math.trunc(kyThu));
}

export function chuKyLabelVi(chuKy: "NGAY" | "THANG" | "NAM"): string {
  if (chuKy === "NGAY") return "1 ngày / lần";
  if (chuKy === "NAM") return "1 năm / lần";
  return "1 tháng / lần";
}

/**
 * Trừ ngang chân sống còn lại (không trúng kỳ này) — khớp phiếu tạm tính:
 * (N − W) × mức góp, với N = tổng chân HV trên dây, W = số chân trúng kỳ.
 * Bằng: tổng tiền hụi − trừ cò − tiền hốt theo hoiTienDaTruCoTheoNhieuChan (cùng lib).
 */
export function truChanSongVND(
  memberSlots: number,
  winnerSlots: number,
  contributionPerSlot: number,
): number {
  const n = Math.max(0, Math.trunc(memberSlots));
  const w = Math.max(0, Math.trunc(winnerSlots));
  const c = Math.max(0, Math.round(contributionPerSlot || 0));
  return Math.max(0, (n - w) * c);
}
