import {
  computeMemberRealizedProfit,
  rowsForMember,
  type HuiLineDetailRow,
  type HuiMemberRef,
} from "@/lib/hui-member-line-metrics";

export type MemberBalanceRow = {
  member: HuiMemberRef;
  /**
   * Theo góc **chủ hụi** (các kỳ đã giao tiền, cộng mọi dây):
   * - **Dương** = đóng nhiều hơn hốt (tiền vào nhiều hơn đã giao cho họ).
   * - **Âm** = hốt nhiều hơn đóng.
   * Bằng âm của tổng `(hốt − đóng)` nội bộ (`realizedProfit`).
   */
  tongThucHien: number;
  soDay: number;
};

export function buildMemberBalanceReport(
  members: HuiMemberRef[],
  rows: HuiLineDetailRow[],
): MemberBalanceRow[] {
  return members.map((member) => {
    const displayRows = rowsForMember(rows, member);
    let tongThucHien = 0;
    for (const row of displayRows) {
      const realized = computeMemberRealizedProfit(row, member).realizedProfit;
      tongThucHien -= realized;
    }
    return { member, tongThucHien, soDay: displayRows.length };
  });
}
