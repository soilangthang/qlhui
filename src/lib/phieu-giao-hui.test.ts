import { describe, expect, it } from "vitest";

import { hoiTienDaTruCoTheoNhieuChan } from "./hui-member-line-metrics";
import {
  chuKyLabelVi,
  computePhieuGiaoBreakdown,
  kyConLaiSauHoot,
  normalizePhieuGiaoContributionVND,
  normalizePhieuGiaoPayoutVND,
  truChanSongVND,
} from "./phieu-giao-hui";

describe("computePhieuGiaoBreakdown", () => {
  it("sample slip: 30 slots, 1 winner, bid 20k => 28 dead + 1 live", () => {
    const M = 200_000;
    const B = 20_000;
    const c = M - B;
    const gross = 28 * M + c;
    const b = computePhieuGiaoBreakdown({
      totalSlots: 30,
      winnerSlots: 1,
      lineAmount: M,
      bidAmount: B,
      contributionPerSlot: c,
      grossPayout: gross,
    });
    expect(b.deadCount).toBe(28);
    expect(b.liveCount).toBe(1);
    expect(b.deadTotal).toBe(28 * M);
    expect(b.liveTotal).toBe(c);
    expect(b.deadTotal + b.liveTotal).toBe(gross);
  });

  it("without bid: all contributors pay the full line amount", () => {
    const b = computePhieuGiaoBreakdown({
      totalSlots: 10,
      winnerSlots: 1,
      lineAmount: 1_000_000,
      bidAmount: 0,
      contributionPerSlot: 1_000_000,
      grossPayout: 9_000_000,
    });
    expect(b.deadCount).toBe(0);
    expect(b.liveCount).toBe(9);
    expect(b.liveTotal).toBe(9_000_000);
  });

  it("multi-slot winner reduces contributors", () => {
    const M = 500_000;
    const B = 50_000;
    const c = 450_000;
    const gross = 5 * M + 2 * c;
    const b = computePhieuGiaoBreakdown({
      totalSlots: 10,
      winnerSlots: 3,
      lineAmount: M,
      bidAmount: B,
      contributionPerSlot: c,
      grossPayout: gross,
    });
    expect(b.contributors).toBe(7);
    expect(b.deadCount + b.liveCount).toBe(7);
  });
});

describe("kyConLaiSauHoot", () => {
  it("period 29/30 => 1 remaining", () => {
    expect(kyConLaiSauHoot(30, 29)).toBe(1);
  });
});

describe("chuKyLabelVi", () => {
  it("renders built-in labels", () => {
    expect(chuKyLabelVi("NGAY")).not.toBe("");
    expect(chuKyLabelVi("THANG")).not.toBe("");
    expect(chuKyLabelVi("NAM")).not.toBe("");
  });

  it("shows GOP cycle days on the receipt", () => {
    expect(chuKyLabelVi("NGAY", "GOP", 10)).toContain("10");
  });
});

describe("truChanSongVND", () => {
  it("matches gross - commission - payout on the temporary receipt", () => {
    const M = 10;
    const N = 2;
    const W = 1;
    const c = 1_500_000;
    const co = 1_000_000;
    const gross = (M - W) * c;
    const hoi = hoiTienDaTruCoTheoNhieuChan(M, N, c, co);
    const tru = truChanSongVND(N, W, c);
    expect(tru).toBe((N - W) * c);
    expect(gross - co - hoi).toBe(tru);
  });
});

describe("GOP receipt normalization", () => {
  it("normalizes live-leg and payout amounts back to the displayed unit", () => {
    const contribution = normalizePhieuGiaoContributionVND(45_000_000, "GOP", 10);
    const gross = normalizePhieuGiaoPayoutVND(405_000_000, "GOP", 10);

    expect(contribution).toBe(4_500_000);
    expect(gross).toBe(40_500_000);
    expect(truChanSongVND(3, 1, contribution)).toBe(9_000_000);
    expect(hoiTienDaTruCoTheoNhieuChan(10, 3, contribution, 2_500_000)).toBe(29_000_000);
  });
});
