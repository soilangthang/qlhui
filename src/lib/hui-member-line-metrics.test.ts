import { describe, expect, it } from "vitest";

import type { HuiLineDetailRow, HuiMemberRef } from "./hui-member-line-metrics";
import {
  balanceAmDuong,
  computeMemberRealizedProfit,
  deadSlotsOnRowForMember,
  futureDeadLegPayEstimate,
  hoiTienDaTruCoTheoNhieuChan,
  participantMatchesMember,
  profitHienTai,
  profitManDay,
  rowPayInPayOut,
  rowsForMember,
} from "./hui-member-line-metrics";

const memberAn: HuiMemberRef = { id: "m-an", name: "An", phone: "0909123456" };
const memberBi: HuiMemberRef = { id: "m-bi", name: "Bình", phone: "0911222333" };

function row(partial: Partial<HuiLineDetailRow> & Pick<HuiLineDetailRow, "participants">): HuiLineDetailRow {
  return {
    lineId: "line-1",
    lineName: "N1",
    lineAmount: 1_000_000,
    lineTienCo: 50_000,
    ngayMo: "2026-01-01T00:00:00.000Z",
    chuKy: "THANG",
    totalCycles: 10,
    latestKy: 1,
    latestDate: "2026-01-15T00:00:00.000Z",
    latestOpeningStatus: "DA_GIAO_TIEN",
    latestBidAmount: 100_000,
    latestContributionPerSlot: 900_000,
    latestGrossPayout: 8_100_000,
    latestFinalPayout: 8_050_000,
    latestWinnerName: "An",
    latestWinnerPhone: "0909123456",
    latestWinnerLegStt: 1,
    latestWinnerSlots: 1,
    openings: [],
    ...partial,
  };
}

describe("hoiTienDaTruCoTheoNhieuChan", () => {
  it("M=10, N=1: 9 chân người khác đóng × contribution − cò", () => {
    expect(hoiTienDaTruCoTheoNhieuChan(10, 1, 900_000, 50_000)).toBe(9 * 900_000 - 50_000);
  });

  it("nhiều chân cùng hụi viên: N=4 trên dây 10 chân", () => {
    expect(hoiTienDaTruCoTheoNhieuChan(10, 4, 1_000_000, 0)).toBe(6_000_000);
  });

  it("N >= M → gross 0, chỉ trừ cò về 0", () => {
    expect(hoiTienDaTruCoTheoNhieuChan(10, 12, 900_000, 50_000)).toBe(0);
  });
});

describe("participantMatchesMember & rowsForMember", () => {
  it("khớp memberId dù tên lệch", () => {
    const p = {
      legStt: 1,
      memberId: memberAn.id,
      memberName: "Lỗi tên",
      memberPhone: "0999999999",
    };
    expect(participantMatchesMember(p, memberAn)).toBe(true);
  });

  it("khớp tên + SĐT khi memberId null", () => {
    const p = {
      legStt: 2,
      memberId: null,
      memberName: "An",
      memberPhone: "0909123456",
    };
    expect(participantMatchesMember(p, memberAn)).toBe(true);
  });

  it("rowsForMember chỉ giữ dây có ít nhất một chân của hụi viên", () => {
    const rows: HuiLineDetailRow[] = [
      row({
        lineId: "a",
        participants: [
          { legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" },
        ],
      }),
      row({
        lineId: "b",
        participants: [{ legStt: 1, memberId: memberBi.id, memberName: "Bình", memberPhone: "0911222333" }],
      }),
    ];
    const forAn = rowsForMember(rows, memberAn);
    expect(forAn).toHaveLength(1);
    expect(forAn[0].lineId).toBe("a");
    expect(forAn[0].memberSlots).toBe(1);
  });

  it("đếm đủ nhiều chân cùng một hụi viên", () => {
    const r = row({
      participants: [
        { legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" },
        { legStt: 2, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" },
        { legStt: 3, memberId: memberBi.id, memberName: "Bình", memberPhone: "0911222333" },
      ],
    });
    const [withSlots] = rowsForMember([r], memberAn);
    expect(withSlots.memberSlots).toBe(2);
  });
});

describe("deadSlotsOnRowForMember (tích lũy theo lịch sử kỳ)", () => {
  it("fallback không có openings: người hốt kỳ mới nhất — 1 chân khớp winnerLegStt", () => {
    const r = row({
      latestWinnerLegStt: 2,
      latestWinnerSlots: 1,
      participants: [
        { legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" },
        { legStt: 2, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" },
      ],
    });
    expect(deadSlotsOnRowForMember(r, memberAn)).toBe(1);
  });

  it("có openings: An đã hốt kỳ 1, kỳ mới nhất Bình hốt → An vẫn 1 chân chết", () => {
    const r = row({
      latestKy: 2,
      latestWinnerName: "Bình",
      latestWinnerPhone: "0911222333",
      latestWinnerLegStt: 2,
      latestContributionPerSlot: 800_000,
      participants: [
        { legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" },
      ],
      openings: [
        {
          kyThu: 1,
          ngayKhui: "2026-01-01",
          status: "DA_GIAO_TIEN",
          contributionPerSlot: 900_000,
          grossPayout: 0,
          finalPayout: 0,
          winnerName: "An",
          winnerPhone: "0909123456",
          winnerLegStt: 1,
          winnerSlots: 1,
          bidAmount: 0,
        },
        {
          kyThu: 2,
          ngayKhui: "2026-02-01",
          status: "CHO_GIAO_TIEN",
          contributionPerSlot: 800_000,
          grossPayout: 0,
          finalPayout: 0,
          winnerName: "Bình",
          winnerPhone: "0911222333",
          winnerLegStt: 2,
          winnerSlots: 1,
          bidAmount: 0,
        },
      ],
    });
    expect(deadSlotsOnRowForMember(r, memberAn)).toBe(1);
  });
});

describe("rowPayInPayOut & balanceAmDuong (snapshot kỳ mới nhất)", () => {
  it("chưa hốt: đóng theo chân sống × contribution", () => {
    const r = {
      ...row({
        latestWinnerName: "Bình",
        latestWinnerPhone: "0911222333",
        participants: [{ legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" }],
      }),
      memberSlots: 1,
    };
    const x = rowPayInPayOut(r, memberAn);
    expect(x.deadSlots).toBe(0);
    expect(x.liveSlots).toBe(1);
    expect(x.isWinner).toBe(false);
    expect(x.payIn).toBe(900_000);
    expect(x.payOut).toBe(0);
    expect(balanceAmDuong(r, memberAn)).toBe(900_000);
  });

  it("đã hốt kỳ mới nhất: payIn 0, payOut theo công thức nhiều chân", () => {
    const r = {
      ...row({
        participants: [{ legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" }],
      }),
      memberSlots: 1,
    };
    const x = rowPayInPayOut(r, memberAn);
    expect(x.isWinner).toBe(true);
    expect(x.payIn).toBe(0);
    expect(x.payOut).toBe(hoiTienDaTruCoTheoNhieuChan(10, 1, 900_000, 50_000));
    expect(balanceAmDuong(r, memberAn)).toBe(-x.payOut);
  });

  it("có chân chết: đóng chân sống × góp kỳ + chân chết × mức dây", () => {
    const r = {
      ...row({
        latestWinnerName: "Bình",
        latestWinnerPhone: "0911222333",
        latestKy: 2,
        latestContributionPerSlot: 800_000,
        openings: [
          {
            kyThu: 1,
            ngayKhui: "2026-01-01",
            status: "DA_GIAO_TIEN",
            contributionPerSlot: 900_000,
            grossPayout: 0,
            finalPayout: 0,
            winnerName: "An",
            winnerPhone: "0909123456",
            winnerLegStt: 1,
            winnerSlots: 1,
            bidAmount: 0,
          },
          {
            kyThu: 2,
            ngayKhui: "2026-02-01",
            status: "CHO_GIAO_TIEN",
            contributionPerSlot: 800_000,
            grossPayout: 0,
            finalPayout: 0,
            winnerName: "Bình",
            winnerPhone: "0911222333",
            winnerLegStt: 2,
            winnerSlots: 1,
            bidAmount: 0,
          },
        ],
        participants: [{ legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" }],
      }),
      memberSlots: 1,
    };
    const x = rowPayInPayOut(r, memberAn);
    expect(x.deadSlots).toBe(1);
    expect(x.liveSlots).toBe(0);
    expect(x.payIn).toBe(1_000_000);
  });
});

describe("futureDeadLegPayEstimate", () => {
  const rowWithDeadAn = row({
    latestWinnerName: "Bình",
    latestWinnerPhone: "0911222333",
    latestKy: 2,
    latestContributionPerSlot: 800_000,
    openings: [
      {
        kyThu: 1,
        ngayKhui: "2026-01-01",
        status: "DA_GIAO_TIEN",
        contributionPerSlot: 900_000,
        grossPayout: 0,
        finalPayout: 0,
        winnerName: "An",
        winnerPhone: "0909123456",
        winnerLegStt: 1,
        winnerSlots: 1,
        bidAmount: 0,
      },
      {
        kyThu: 2,
        ngayKhui: "2026-02-01",
        status: "CHO_GIAO_TIEN",
        contributionPerSlot: 800_000,
        grossPayout: 0,
        finalPayout: 0,
        winnerName: "Bình",
        winnerPhone: "0911222333",
        winnerLegStt: 2,
        winnerSlots: 1,
        bidAmount: 0,
      },
    ],
    participants: [{ legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" }],
  });

  it("0 nếu là người hốt kỳ mới nhất", () => {
    const r = row({ participants: [{ legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" }] });
    expect(futureDeadLegPayEstimate(r, memberAn)).toBe(0);
  });

  it("chân chết × mức dây × (M − kỳ hiện tại)", () => {
    expect(futureDeadLegPayEstimate(rowWithDeadAn, memberAn)).toBe(1_000_000 * (10 - 2));
  });

  it("0 khi đã khui đủ kỳ (không còn kỳ sau)", () => {
    expect(futureDeadLegPayEstimate({ ...rowWithDeadAn, latestKy: 10, totalCycles: 10 }, memberAn)).toBe(0);
  });

  it("0 khi không có chân chết", () => {
    const r = row({
      latestWinnerName: "Bình",
      latestWinnerPhone: "0911222333",
      latestKy: 3,
      participants: [{ legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" }],
      openings: [],
    });
    expect(deadSlotsOnRowForMember(r, memberAn)).toBe(0);
    expect(futureDeadLegPayEstimate(r, memberAn)).toBe(0);
  });
});

describe("profitManDay", () => {
  it("trùng profitHienTai khi đã hết kỳ (latestKy = totalCycles)", () => {
    const r = {
      ...row({
        latestWinnerName: "Bình",
        latestWinnerPhone: "0911222333",
        latestKy: 10,
        totalCycles: 10,
        participants: [{ legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" }],
      }),
      memberSlots: 1,
    };
    expect(profitManDay(r, memberAn)).toBe(profitHienTai(r, memberAn));
  });

  it("trùng profitHienTai khi là người hốt kỳ mới nhất", () => {
    const r = {
      ...row({
        participants: [{ legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" }],
      }),
      memberSlots: 1,
    };
    expect(profitManDay(r, memberAn)).toBe(profitHienTai(r, memberAn));
  });

  it("chỉ chân sống: trừ thêm perKy × kỳ còn lại", () => {
    const r = {
      ...row({
        latestWinnerName: "Bình",
        latestWinnerPhone: "0911222333",
        latestKy: 1,
        totalCycles: 10,
        participants: [{ legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" }],
      }),
      memberSlots: 1,
    };
    const hi = profitHienTai(r, memberAn);
    const perKy = 900_000;
    const remainingKy = 9;
    expect(profitManDay(r, memberAn)).toBe(hi - perKy * remainingKy);
  });

  it("có chân chết: perKy = chân sống × góp + chân chết × dây", () => {
    const r = {
      ...row({
        latestWinnerName: "Bình",
        latestWinnerPhone: "0911222333",
        latestKy: 2,
        latestContributionPerSlot: 800_000,
        openings: [
          {
            kyThu: 1,
            ngayKhui: "2026-01-01",
            status: "DA_GIAO_TIEN",
            contributionPerSlot: 900_000,
            grossPayout: 0,
            finalPayout: 0,
            winnerName: "An",
            winnerPhone: "0909123456",
            winnerLegStt: 1,
            winnerSlots: 1,
            bidAmount: 0,
          },
          {
            kyThu: 2,
            ngayKhui: "2026-02-01",
            status: "CHO_GIAO_TIEN",
            contributionPerSlot: 800_000,
            grossPayout: 0,
            finalPayout: 0,
            winnerName: "Bình",
            winnerPhone: "0911222333",
            winnerLegStt: 2,
            winnerSlots: 1,
            bidAmount: 0,
          },
        ],
        participants: [{ legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" }],
      }),
      memberSlots: 1,
    };
    const hi = profitHienTai(r, memberAn);
    const perKy = 800_000 * 0 + 1_000_000 * 1;
    const remainingKy = 8;
    expect(profitManDay(r, memberAn)).toBe(hi - perKy * remainingKy);
  });
});

describe("computeMemberRealizedProfit (lịch sử DA_GIAO_TIEN)", () => {
  it("chưa có kỳ DA: toàn chân sống, lợi nhuận 0", () => {
    const r = {
      ...row({
        openings: [{ kyThu: 1, ngayKhui: "2026-01-01", status: "CHO_GIAO_TIEN", contributionPerSlot: 900_000, grossPayout: 0, finalPayout: 0, winnerName: "X", winnerPhone: "0999000000", winnerLegStt: 1, winnerSlots: 1, bidAmount: 0 }],
        participants: [{ legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" }],
      }),
      memberSlots: 1,
    };
    const out = computeMemberRealizedProfit(r, memberAn);
    expect(out.deadSlots).toBe(0);
    expect(out.liveSlots).toBe(1);
    expect(out.realizedProfit).toBe(0);
    expect(out.kyDaDong).toBe(0);
  });

  it("một kỳ DA — không hốt: chỉ đóng → realizedProfit âm (hốt−đóng)", () => {
    const r = {
      ...row({
        openings: [
          {
            kyThu: 1,
            ngayKhui: "2026-01-01",
            status: "DA_GIAO_TIEN",
            contributionPerSlot: 900_000,
            grossPayout: 8_100_000,
            finalPayout: 8_050_000,
            winnerName: "Bình",
            winnerPhone: "0911222333",
            winnerLegStt: 2,
            winnerSlots: 1,
            bidAmount: 100_000,
          },
        ],
        participants: [{ legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" }],
      }),
      memberSlots: 1,
    };
    const out = computeMemberRealizedProfit(r, memberAn);
    expect(out.deadSlots).toBe(0);
    expect(out.realizedProfit).toBe(-900_000);
  });

  it("hốt một kỳ: nhận tiền, chân chết tăng, chân sống giảm", () => {
    const payout = hoiTienDaTruCoTheoNhieuChan(10, 2, 900_000, 50_000);
    const r = {
      ...row({
        openings: [
          {
            kyThu: 1,
            ngayKhui: "2026-01-01",
            status: "DA_GIAO_TIEN",
            contributionPerSlot: 900_000,
            grossPayout: 0,
            finalPayout: 0,
            winnerName: "An",
            winnerPhone: "0909123456",
            winnerLegStt: 1,
            winnerSlots: 1,
            bidAmount: 100_000,
          },
        ],
        participants: [
          { legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" },
          { legStt: 2, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" },
        ],
      }),
      memberSlots: 2,
    };
    const out = computeMemberRealizedProfit(r, memberAn);
    expect(out.deadSlots).toBe(1);
    expect(out.liveSlots).toBe(1);
    expect(out.realizedProfit).toBe(payout);
    expect(out.kyDaDong).toBe(1);
  });

  it("hai kỳ DA: kỳ 1 đóng, kỳ 2 hốt — dead sau kỳ 2, payIn kỳ 2 gồm chân chết × lineAmount", () => {
    const co = 50_000;
    const c1 = 900_000;
    const c2 = 800_000;
    const payoutK2 = hoiTienDaTruCoTheoNhieuChan(10, 1, c2, co);
    const r = {
      ...row({
        openings: [
          {
            kyThu: 1,
            ngayKhui: "2026-01-01",
            status: "DA_GIAO_TIEN",
            contributionPerSlot: c1,
            grossPayout: 0,
            finalPayout: 0,
            winnerName: "Bình",
            winnerPhone: "0911222333",
            winnerLegStt: 5,
            winnerSlots: 1,
            bidAmount: 0,
          },
          {
            kyThu: 2,
            ngayKhui: "2026-02-01",
            status: "DA_GIAO_TIEN",
            contributionPerSlot: c2,
            grossPayout: 0,
            finalPayout: 0,
            winnerName: "An",
            winnerPhone: "0909123456",
            winnerLegStt: 1,
            winnerSlots: 1,
            bidAmount: 0,
          },
        ],
        participants: [{ legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" }],
      }),
      memberSlots: 1,
    };
    const payInK1 = c1;
    const out = computeMemberRealizedProfit(r, memberAn);
    expect(out.deadSlots).toBe(1);
    expect(out.liveSlots).toBe(0);
    expect(out.realizedProfit).toBe(payoutK2 - payInK1);
  });

  it("sau kỳ hốt: kỳ tiếp chân chết đóng lineAmount, chân sống đóng contribution", () => {
    const lineAmount = 1_000_000;
    const r = {
      ...row({
        lineAmount,
        openings: [
          {
            kyThu: 1,
            ngayKhui: "2026-01-01",
            status: "DA_GIAO_TIEN",
            contributionPerSlot: 900_000,
            grossPayout: 0,
            finalPayout: 0,
            winnerName: "An",
            winnerPhone: "0909123456",
            winnerLegStt: 1,
            winnerSlots: 1,
            bidAmount: 0,
          },
          {
            kyThu: 2,
            ngayKhui: "2026-02-01",
            status: "DA_GIAO_TIEN",
            contributionPerSlot: 850_000,
            grossPayout: 0,
            finalPayout: 0,
            winnerName: "Bình",
            winnerPhone: "0911222333",
            winnerLegStt: 2,
            winnerSlots: 1,
            bidAmount: 0,
          },
        ],
        participants: [
          { legStt: 1, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" },
          { legStt: 2, memberId: memberAn.id, memberName: "An", memberPhone: "0909123456" },
        ],
      }),
      memberSlots: 2,
    };
    const payOutK1 = hoiTienDaTruCoTheoNhieuChan(10, 2, 900_000, 50_000);
    const payInK2 = 1 * 850_000 + 1 * lineAmount;
    const out = computeMemberRealizedProfit(r, memberAn);
    expect(out.deadSlots).toBe(1);
    expect(out.liveSlots).toBe(1);
    expect(out.realizedProfit).toBe(payOutK1 - payInK2);
  });
});
