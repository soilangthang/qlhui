/** Dữ liệu một dây hụi + kỳ mới nhất, dùng cho phiếu tạm thu và báo cáo hụi viên */

export type HuiMemberRef = {
  id: string;
  name: string;
  phone: string;
};

export type HuiLineParticipant = {
  legStt: number;
  memberId: string | null;
  memberName: string | null;
  memberPhone: string | null;
};

/**
 * Tối thiểu cho tính chân chết / lãi lỗ — không gửi gross/final/bid/ngày từng kỳ trong payload RSC
 * (vẫn giữ trên `latest*` của dòng).
 */
export type HuiOpeningForMetrics = {
  kyThu: number;
  status: "CHO_GIAO_TIEN" | "DA_GIAO_TIEN";
  contributionPerSlot: number;
  winnerName: string | null;
  winnerPhone: string | null;
  winnerLegStt: number | null;
  winnerSlots: number;
};

/** Đầy đủ trường (vd. theo dõi / hiển thị lịch sử chi tiết). */
export type HuiOpeningHistory = HuiOpeningForMetrics & {
  ngayKhui: string;
  grossPayout: number;
  finalPayout: number;
  bidAmount: number;
};

export type HuiLineDetailRow = {
  lineId: string;
  lineName: string;
  lineAmount: number;
  lineTienCo: number;
  /** Ngày mở dây (ISO) */
  ngayMo: string;
  chuKy: "NGAY" | "THANG" | "NAM";
  totalCycles: number;
  latestKy: number | null;
  latestDate: string | null;
  latestOpeningStatus: "CHO_GIAO_TIEN" | "DA_GIAO_TIEN" | null;
  latestBidAmount: number;
  latestContributionPerSlot: number;
  latestGrossPayout: number;
  latestFinalPayout: number;
  latestWinnerName: string | null;
  latestWinnerPhone: string | null;
  latestWinnerLegStt: number | null;
  latestWinnerSlots: number;
  participants: HuiLineParticipant[];
  openings: HuiOpeningForMetrics[];
};

export function formatMoneyVN(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export function profitToneClass(value: number) {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-rose-600";
  return "text-slate-700";
}

/** Tiền hốt thực nhận (đã trừ cò chủ). */
export function hoiTienDaTruCo(row: HuiLineDetailRow): number {
  const co = Math.max(0, Math.round(Number(row.lineTienCo) || 0));
  const gross = Math.max(0, Math.round(row.latestGrossPayout || 0));
  if (gross > 0) {
    return Math.max(0, gross - co);
  }
  return Math.max(0, Math.round(row.latestFinalPayout || 0));
}

/**
 * Tiền hốt cho hụi viên theo quy tắc trừ ngang nhiều chân:
 * A = (M - N) * giá đã trừ thăm - tiền cò
 * - M: tổng số chân dây (row.totalCycles)
 * - N: tổng số chân của hụi viên trên dây (memberSlots)
 */
export function hoiTienDaTruCoTheoNhieuChan(
  totalSlots: number,
  memberSlots: number,
  contributionPerSlot: number,
  lineTienCo: number,
): number {
  const m = Math.max(0, Math.trunc(totalSlots));
  const n = Math.max(0, Math.trunc(memberSlots));
  const contribution = Math.max(0, Math.round(contributionPerSlot || 0));
  const co = Math.max(0, Math.round(lineTienCo || 0));
  const gross = Math.max(0, m - n) * contribution;
  return Math.max(0, gross - co);
}

export function khuiTrungKyGroupKey(row: HuiLineDetailRow): string {
  if (row.latestKy != null && row.latestDate) {
    const day = row.latestDate.slice(0, 10);
    return `ky${row.latestKy}|${day}`;
  }
  return `line:${row.lineId}`;
}

/** Chuẩn hóa SĐT để so khớp (bỏ khoảng trắng, dấu, chỉ giữ số). */
export function normalizeParticipantPhone(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeParticipantName(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function participantNamesLooselyEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeParticipantName(a).toLowerCase() === normalizeParticipantName(b).toLowerCase();
}

/** Người hốt trong opening / dòng mới nhất có cùng logic khớp tên+SĐT. */
export function openingWinnerMatchesMember(
  winnerName: string | null | undefined,
  winnerPhone: string | null | undefined,
  member: HuiMemberRef,
): boolean {
  if (!participantNamesLooselyEqual(winnerName, member.name)) return false;
  const wp = normalizeParticipantPhone(winnerPhone);
  const mp = normalizeParticipantPhone(member.phone);
  if (mp.length >= 9 && wp.length >= 9) return wp === mp;
  if (mp.length >= 9 && wp.length === 0) return true;
  return wp.length === 0 && mp.length === 0;
}

export function participantMatchesMember(p: HuiLineParticipant, member: HuiMemberRef) {
  if (p.memberId && p.memberId === member.id) return true;
  const phoneOk =
    normalizeParticipantPhone(p.memberPhone) === normalizeParticipantPhone(member.phone) &&
    normalizeParticipantPhone(member.phone).length >= 9;
  const nameOk = participantNamesLooselyEqual(p.memberName, member.name);
  /** Khớp tên+SĐT kể cả khi chân lưu sai `memberId:` — tránh thiếu dây trên phiếu/báo cáo. */
  if (phoneOk && nameOk) return true;
  return false;
}

/**
 * Sau khi xử lý một kỳ khui: nếu hụi viên hốt, tăng số chân chết (tối đa số chân của họ trên dây).
 * Dùng thống nhất cho lịch sử DA và cho snapshot từ toàn bộ openings (kể cả CHO_GIAO_TIEN).
 */
function bumpDeadSlotsAfterMemberWonKy(
  row: HuiLineDetailRow,
  opening: Pick<HuiOpeningForMetrics, "winnerName" | "winnerPhone" | "winnerLegStt" | "winnerSlots">,
  member: HuiMemberRef,
  memberSlots: number,
  deadSlots: number,
  memberLegsStt: Set<number>,
): number {
  if (!openingWinnerMatchesMember(opening.winnerName, opening.winnerPhone, member)) {
    return deadSlots;
  }
  const wLeg = opening.winnerLegStt;
  if (wLeg != null && wLeg > 0) {
    const matched = memberLegsStt.has(wLeg) ? 1 : 0;
    const fallback = Math.min(memberSlots - deadSlots, Math.max(1, opening.winnerSlots || 1));
    const inc = matched > 0 ? matched : Math.max(0, fallback);
    return Math.min(memberSlots, deadSlots + inc);
  }
  const inc = Math.max(1, opening.winnerSlots || 1);
  return Math.min(memberSlots, deadSlots + inc);
}

/** Tổng chân chết tích lũy (đã hốt ở các kỳ trước / kỳ hiện tại), để tính đóng: chân chết × mức dây + chân sống × mức góp kỳ. */
export function deadSlotsOnRowForMember(row: HuiLineDetailRow, member: HuiMemberRef | null): number {
  if (!member) return 0;
  const memberSlots = row.participants.reduce(
    (acc, p) => (participantMatchesMember(p, member) ? acc + 1 : acc),
    0,
  );
  if (memberSlots <= 0) return 0;

  const memberLegsStt = new Set(
    row.participants.filter((p) => participantMatchesMember(p, member)).map((p) => p.legStt),
  );

  if (row.openings.length > 0) {
    let dead = 0;
    const sorted = [...row.openings].sort((a, b) => a.kyThu - b.kyThu);
    for (const o of sorted) {
      dead = bumpDeadSlotsAfterMemberWonKy(row, o, member, memberSlots, dead, memberLegsStt);
    }
    return dead;
  }

  if (!openingWinnerMatchesMember(row.latestWinnerName, row.latestWinnerPhone, member)) return 0;
  if (row.latestWinnerLegStt != null && row.latestWinnerLegStt > 0) {
    const matched = row.participants.reduce((acc, p) => {
      if (!participantMatchesMember(p, member)) return acc;
      return p.legStt === row.latestWinnerLegStt ? acc + 1 : acc;
    }, 0);
    if (matched > 0) return matched;
  }
  const cap = Math.max(1, row.latestWinnerSlots);
  return Math.min(memberSlots, cap);
}

export function isMemberWinnerOnRow(row: HuiLineDetailRow, member: HuiMemberRef | null): boolean {
  if (!member) return false;
  return openingWinnerMatchesMember(row.latestWinnerName, row.latestWinnerPhone, member);
}

export function futureDeadLegPayEstimate(row: HuiLineDetailRow, member: HuiMemberRef | null): number {
  if (isMemberWinnerOnRow(row, member)) return 0;
  const dead = deadSlotsOnRowForMember(row, member);
  if (dead <= 0 || row.latestKy == null || row.latestKy <= 0) return 0;
  const remainingKy = Math.max(0, row.totalCycles - row.latestKy);
  if (remainingKy <= 0) return 0;
  return dead * row.lineAmount * remainingKy;
}

export function formatDateDisplay(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/** DD/MM/YY cho cột ngày hốt dự kiến */
export function formatDateShortYY(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = String(date.getFullYear()).slice(-2);
  return `${d}/${m}/${y}`;
}

export function addCycleFromDate(from: Date, chuKy: HuiLineDetailRow["chuKy"]): Date {
  const d = new Date(from.getTime());
  if (chuKy === "NGAY") d.setDate(d.getDate() + 1);
  else if (chuKy === "THANG") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

/** Ngày hốt dự kiến (kỳ kế tiếp, ước lượng theo chu kỳ sau lần khui gần nhất — áp dụng mỗi dây). */
export function nextHootDateIso(row: HuiLineDetailRow): string | null {
  const total = row.totalCycles;
  const k = row.latestKy;
  if (k != null && k >= total) return null;
  if (k == null || k <= 0) {
    return row.ngayMo || null;
  }
  if (!row.latestDate) return row.ngayMo || null;
  const base = new Date(row.latestDate);
  return addCycleFromDate(base, row.chuKy).toISOString();
}

export type RowWithMemberSlots = HuiLineDetailRow & { memberSlots: number };

export function rowsForMember(rows: HuiLineDetailRow[], member: HuiMemberRef | null): RowWithMemberSlots[] {
  if (!member) return [];
  return rows
    .map((row) => {
      const memberSlots = row.participants.reduce(
        (acc, p) => (participantMatchesMember(p, member) ? acc + 1 : acc),
        0,
      );
      return { ...row, memberSlots };
    })
    .filter((row) => row.memberSlots > 0);
}

export function rowPayInPayOut(row: RowWithMemberSlots, member: HuiMemberRef | null) {
  const isWinner = isMemberWinnerOnRow(row, member);
  const deadSlots = deadSlotsOnRowForMember(row, member);
  const liveSlots = Math.max(0, row.memberSlots - deadSlots);
  const contribution = row.latestContributionPerSlot || row.lineAmount;
  const payIn = isWinner ? 0 : contribution * liveSlots + deadSlots * row.lineAmount;
  const payOut = isWinner
    ? hoiTienDaTruCoTheoNhieuChan(row.totalCycles, row.memberSlots, contribution, row.lineTienCo)
    : 0;
  return { payIn, payOut, deadSlots, liveSlots, contribution, isWinner };
}

/** Lợi nhuận hiện tại (đã hốt − đã đóng) theo dòng. */
export function profitHienTai(row: RowWithMemberSlots, member: HuiMemberRef | null) {
  const { payIn, payOut } = rowPayInPayOut(row, member);
  return payOut - payIn;
}

/**
 * Ước lượng thô: nếu không hốt thêm, trừ phần đóng còn lại
 * (chân sống × mức góp kỳ + chân chết × mức dây) × số kỳ còn lại.
 * Khi đã hốt trên dây hoặc dây đã đủ kỳ → trùng hiện tại.
 */
export function profitManDay(row: RowWithMemberSlots, member: HuiMemberRef | null) {
  const hi = profitHienTai(row, member);
  const k = row.latestKy ?? 0;
  const remainingKy = Math.max(0, row.totalCycles - k);
  if (remainingKy <= 0) return hi;
  const { isWinner, contribution, liveSlots, deadSlots } = rowPayInPayOut(row, member);
  if (isWinner) return hi;
  const perKy = contribution * liveSlots + row.lineAmount * deadSlots;
  return hi - perKy * remainingKy;
}

export function balanceAmDuong(row: RowWithMemberSlots, member: HuiMemberRef | null) {
  const { payIn, payOut } = rowPayInPayOut(row, member);
  return payIn - payOut;
}

function payOutDaTruCoForOpening(
  row: HuiLineDetailRow,
  opening: HuiOpeningForMetrics,
  memberSlots: number,
): number {
  const contribution = opening.contributionPerSlot || row.lineAmount;
  return hoiTienDaTruCoTheoNhieuChan(row.totalCycles, memberSlots, contribution, row.lineTienCo);
}

/**
 * Tính lợi nhuận REALIZED cho 1 member trên 1 dây.
 * - Chỉ duyệt các HuiOpening có `status=DA_GIAO_TIEN`.
 * - Giữ quy tắc triệt tiêu ở kỳ winner.
 * - Dead leg vẫn đóng theo `lineAmount` ở các kỳ đã DA.
 */
export function computeMemberRealizedProfit(row: RowWithMemberSlots, member: HuiMemberRef | null) {
  if (!member) {
    return {
      kyDaDong: 0,
      deadSlots: 0,
      liveSlots: 0,
      realizedProfit: 0,
    };
  }

  const memberSlots = row.memberSlots;
  const memberLegsStt = new Set(
    row.participants
      .filter((p) => participantMatchesMember(p, member))
      .map((p) => p.legStt),
  );

  let deadSlots = 0;
  let realizedPayIn = 0;
  let realizedPayOut = 0;
  let lastDaKy = 0;

  // REALIZED: chỉ tính các kỳ đã "DA_GIAO_TIEN"
  const completedOpenings = row.openings.filter((o) => o.status === "DA_GIAO_TIEN");
  // Bảo đảm đúng thứ tự cho mô phỏng dead/live theo thời gian
  completedOpenings.sort((a, b) => a.kyThu - b.kyThu);

  for (const opening of completedOpenings) {
    lastDaKy = Math.max(lastDaKy, opening.kyThu);
    const contribution = opening.contributionPerSlot || row.lineAmount;

    const isWinner = openingWinnerMatchesMember(opening.winnerName, opening.winnerPhone, member);

    if (isWinner) {
      realizedPayOut += payOutDaTruCoForOpening(row, opening, memberSlots);

      // Triệt tiêu: winner kỳ đó không tính payIn.
      deadSlots = bumpDeadSlotsAfterMemberWonKy(row, opening, member, memberSlots, deadSlots, memberLegsStt);
    } else {
      const liveSlots = Math.max(0, memberSlots - deadSlots);
      // Dead leg vẫn phải đóng tới mãn dây, giá chân chết = mức giá dây.
      realizedPayIn += liveSlots * contribution + deadSlots * row.lineAmount;
    }
  }

  const kyDaDong = lastDaKy;
  const liveSlotsNow = Math.max(0, memberSlots - deadSlots);

  const realizedProfit = realizedPayOut - realizedPayIn;

  return {
    kyDaDong,
    deadSlots,
    liveSlots: liveSlotsNow,
    realizedProfit,
  };
}
