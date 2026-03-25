import { describe, expect, it } from "vitest";

import { buildMemberBalanceReport } from "./bao-cao-hui-vien";
import {
  computeMemberRealizedProfit,
  rowsForMember,
  type HuiLineDetailRow,
  type HuiMemberRef,
} from "./hui-member-line-metrics";

const an: HuiMemberRef = { id: "a1", name: "An", phone: "0909123456" };
const bi: HuiMemberRef = { id: "b1", name: "Bình", phone: "0911222333" };

function opening(
  ky: number,
  status: "DA_GIAO_TIEN" | "CHO_GIAO_TIEN",
  winner: HuiMemberRef,
  contribution: number,
) {
  return {
    kyThu: ky,
    status,
    contributionPerSlot: contribution,
    winnerName: winner.name,
    winnerPhone: winner.phone,
    winnerLegStt: 1,
    winnerSlots: 1,
  };
}

function line(
  id: string,
  participants: HuiLineDetailRow["participants"],
  openings: HuiLineDetailRow["openings"],
  totalCycles = 10,
): HuiLineDetailRow {
  const lastDa = [...openings].filter((o) => o.status === "DA_GIAO_TIEN").sort((x, y) => y.kyThu - x.kyThu)[0];
  const contrib = lastDa?.contributionPerSlot ?? 900_000;
  const latestDateIso =
    lastDa != null
      ? `2026-${String(lastDa.kyThu).padStart(2, "0")}-01T00:00:00.000Z`
      : null;
  return {
    lineId: id,
    lineName: id,
    lineAmount: 1_000_000,
    lineTienCo: 50_000,
    ngayMo: "2026-01-01T00:00:00.000Z",
    chuKy: "THANG",
    totalCycles,
    latestKy: lastDa?.kyThu ?? null,
    latestDate: latestDateIso,
    latestOpeningStatus: lastDa ? "DA_GIAO_TIEN" : null,
    latestBidAmount: 0,
    latestContributionPerSlot: contrib,
    latestGrossPayout: 0,
    latestFinalPayout: 0,
    latestWinnerName: lastDa ? lastDa.winnerName : null,
    latestWinnerPhone: lastDa ? lastDa.winnerPhone : null,
    latestWinnerLegStt: 1,
    latestWinnerSlots: 1,
    participants,
    openings,
  };
}

describe("buildMemberBalanceReport", () => {
  it("tongThucHien = −sum(realizedProfit) trên mọi dây của hụi viên", () => {
    const rows: HuiLineDetailRow[] = [
      line(
        "L1",
        [{ legStt: 1, memberId: an.id, memberName: an.name, memberPhone: an.phone }],
        [opening(1, "DA_GIAO_TIEN", bi, 900_000)],
      ),
      line(
        "L2",
        [{ legStt: 1, memberId: an.id, memberName: an.name, memberPhone: an.phone }],
        [opening(1, "DA_GIAO_TIEN", bi, 800_000)],
      ),
    ];
    const report = buildMemberBalanceReport([an], rows);
    expect(report).toHaveLength(1);
    expect(report[0].soDay).toBe(2);
    const sumRealized = rowsForMember(rows, an).reduce(
      (acc, r) => acc + computeMemberRealizedProfit(r, an).realizedProfit,
      0,
    );
    expect(report[0].tongThucHien).toBe(-sumRealized);
  });

  it("hụi viên không tham gia dây nào → tongThucHien 0, soDay 0", () => {
    const rows: HuiLineDetailRow[] = [
      line(
        "L1",
        [{ legStt: 1, memberId: bi.id, memberName: bi.name, memberPhone: bi.phone }],
        [opening(1, "DA_GIAO_TIEN", bi, 900_000)],
      ),
    ];
    const report = buildMemberBalanceReport([an], rows);
    expect(report[0].tongThucHien).toBe(0);
    expect(report[0].soDay).toBe(0);
  });

  it("Dương khi chỉ đóng chưa hốt (realizedProfit âm → tongThucHien dương)", () => {
    const rows: HuiLineDetailRow[] = [
      line(
        "L1",
        [{ legStt: 1, memberId: an.id, memberName: an.name, memberPhone: an.phone }],
        [opening(1, "DA_GIAO_TIEN", bi, 900_000)],
      ),
    ];
    const [row] = buildMemberBalanceReport([an], rows);
    expect(row.tongThucHien).toBe(900_000);
  });

  it("nhiều chân: báo cáo vẫn cộng đúng theo computeMemberRealizedProfit", () => {
    const rows: HuiLineDetailRow[] = [
      line(
        "L3",
        [
          { legStt: 1, memberId: an.id, memberName: an.name, memberPhone: an.phone },
          { legStt: 2, memberId: an.id, memberName: an.name, memberPhone: an.phone },
        ],
        [
          {
            kyThu: 1,
            status: "DA_GIAO_TIEN",
            contributionPerSlot: 900_000,
            winnerName: an.name,
            winnerPhone: an.phone,
            winnerLegStt: 1,
            winnerSlots: 1,
          },
        ],
        10,
      ),
    ];
    const slotRow = { ...rows[0], memberSlots: 2 };
    const realized = computeMemberRealizedProfit(slotRow, an).realizedProfit;
    const [row] = buildMemberBalanceReport([an], rows);
    expect(row.tongThucHien).toBe(-realized);
    expect(row.soDay).toBe(1);
  });

  it("nhiều hụi viên: mỗi dòng một bản ghi", () => {
    const rows: HuiLineDetailRow[] = [
      line(
        "L1",
        [
          { legStt: 1, memberId: an.id, memberName: an.name, memberPhone: an.phone },
          { legStt: 2, memberId: bi.id, memberName: bi.name, memberPhone: bi.phone },
        ],
        [opening(1, "DA_GIAO_TIEN", bi, 900_000)],
      ),
    ];
    const report = buildMemberBalanceReport([an, bi], rows);
    expect(report).toHaveLength(2);
    expect(report.map((r) => r.member.id).sort()).toEqual(["a1", "b1"]);
    const byAn = report.find((r) => r.member.id === "a1")!;
    const byBi = report.find((r) => r.member.id === "b1")!;
    expect(byAn.soDay).toBe(1);
    expect(byBi.soDay).toBe(1);
    expect(byBi.tongThucHien).not.toBe(byAn.tongThucHien);
  });
});
