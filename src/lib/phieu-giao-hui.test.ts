import { describe, expect, it } from "vitest";

import {
  chuKyLabelVi,
  computePhieuGiaoBreakdown,
  kyConLaiSauHoot,
  truChanSongVND,
} from "./phieu-giao-hui";
import { hoiTienDaTruCoTheoNhieuChan } from "./hui-member-line-metrics";

describe("computePhieuGiaoBreakdown", () => {
  it("mẫu phiếu: 30 chân, 1 hốt, thăm 20k → 28 chết + 1 sống", () => {
    const M = 200_000;
    const B = 20_000;
    const c = M - B;
    const gross = 28 * M + 1 * c;
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

  it("không thăm: toàn bộ người đóng đủ mức dây", () => {
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

  it("nhiều chân hốt: contributors giảm", () => {
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
  it("kỳ 29/30 → còn 1", () => {
    expect(kyConLaiSauHoot(30, 29)).toBe(1);
  });
});

describe("chuKyLabelVi", () => {
  it("nhãn hiển thị", () => {
    expect(chuKyLabelVi("NGAY")).toContain("ngày");
    expect(chuKyLabelVi("THANG")).toContain("tháng");
    expect(chuKyLabelVi("NAM")).toContain("năm");
  });
});

describe("truChanSongVND", () => {
  it("khớp gross − cò − hoiTien (phiếu tạm tính)", () => {
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
