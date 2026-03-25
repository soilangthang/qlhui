import { describe, expect, it } from "vitest";

import { filterRowsForPhieuTamThu, hoChiMinhCalendarKeyFromDate } from "@/lib/local-calendar";

type Row = { latestDate: string | null; latestKy: number | null; id: string };

describe("filterRowsForPhieuTamThu", () => {
  /** 26/03/2026 00:55 giờ VN ≈ 25/03/2026 17:55 UTC */
  const nowVN_March26 = new Date("2026-03-25T17:55:00.000Z");

  it("when no line opened today (VN), still includes rows whose latest opening is within 7 calendar days", () => {
    expect(hoChiMinhCalendarKeyFromDate(nowVN_March26)).toBe("2026-03-26");

    const rows: Row[] = [
      {
        id: "a",
        latestKy: 2,
        /** 25/03/2026 buổi chiều VN */
        latestDate: "2026-03-25T10:00:00.000Z",
      },
    ];
    const out = filterRowsForPhieuTamThu(rows, nowVN_March26);
    expect(out.map((r) => r.id)).toEqual(["a"]);
  });

  it("when a line opened today, keeps same-ky within 7 days rule", () => {
    const rows: Row[] = [
      { id: "today", latestKy: 2, latestDate: "2026-03-25T17:30:00.000Z" },
      { id: "yesterdaySameKy", latestKy: 2, latestDate: "2026-03-24T17:00:00.000Z" },
      { id: "otherKy", latestKy: 1, latestDate: "2026-03-24T17:00:00.000Z" },
    ];
    const out = filterRowsForPhieuTamThu(rows, nowVN_March26);
    expect(new Set(out.map((r) => r.id))).toEqual(new Set(["today", "yesterdaySameKy"]));
  });

  it("excludes rows older than 7 VN calendar days when fallback applies", () => {
    const rows: Row[] = [
      { id: "old", latestKy: 2, latestDate: "2026-03-10T10:00:00.000Z" },
    ];
    const out = filterRowsForPhieuTamThu(rows, nowVN_March26);
    expect(out).toHaveLength(0);
  });
});
