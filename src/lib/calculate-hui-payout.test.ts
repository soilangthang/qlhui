import { describe, expect, it } from "vitest";

import { calculateHuiPayout } from "./calculate-hui-payout";

describe("calculateHuiPayout", () => {
  it("10 chân, 1 chân hốt: 9 người đóng, trừ thăm và cò", () => {
    const r = calculateHuiPayout({
      totalSlots: 10,
      winnerSlots: 1,
      huiAmount: 1_000_000,
      bidAmount: 100_000,
      commission: 50_000,
    });
    expect(r.contributors).toBe(9);
    expect(r.contributionPerSlot).toBe(900_000);
    expect(r.grossPayout).toBe(9 * 900_000);
    expect(r.finalPayout).toBe(9 * 900_000 - 50_000);
  });

  it("nhiều chân hốt: contributors = totalSlots - winnerSlots", () => {
    const r = calculateHuiPayout({
      totalSlots: 15,
      winnerSlots: 4,
      huiAmount: 2_000_000,
      bidAmount: 200_000,
      commission: 0,
    });
    expect(r.contributors).toBe(11);
    expect(r.contributionPerSlot).toBe(1_800_000);
    expect(r.grossPayout).toBe(11 * 1_800_000);
    expect(r.finalPayout).toBe(11 * 1_800_000);
  });

  it("tiền cò lớn hơn gross → finalPayout = 0", () => {
    const r = calculateHuiPayout({
      totalSlots: 5,
      winnerSlots: 1,
      huiAmount: 1_000_000,
      bidAmount: 0,
      commission: 10_000_000,
    });
    expect(r.grossPayout).toBe(4_000_000);
    expect(r.finalPayout).toBe(0);
  });

  it("winnerSlots = 0: toàn dây đóng", () => {
    const r = calculateHuiPayout({
      totalSlots: 8,
      winnerSlots: 0,
      huiAmount: 500_000,
      bidAmount: 0,
      commission: 0,
    });
    expect(r.contributors).toBe(8);
    expect(r.contributionPerSlot).toBe(500_000);
    expect(r.grossPayout).toBe(4_000_000);
  });

  it("từ chối số không nguyên hoặc âm", () => {
    expect(() =>
      calculateHuiPayout({
        totalSlots: 10,
        winnerSlots: 1,
        huiAmount: 1_000_000,
        bidAmount: 1.5,
        commission: 0,
      }),
    ).toThrow(/bidAmount/);

    expect(() =>
      calculateHuiPayout({
        totalSlots: -1,
        winnerSlots: 0,
        huiAmount: 1,
        bidAmount: 0,
        commission: 0,
      }),
    ).toThrow(/totalSlots/);
  });
});
