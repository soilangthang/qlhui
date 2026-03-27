/** Ngày theo lịch máy (timezone local của môi trường chạy code). */

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function localCalendarKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function localCalendarKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return localCalendarKey(new Date(iso));
}

/** Kỳ mới nhất của dây có `ngayKhui` trùng ngày lịch với `ref` (thường là hôm nay). */
export function isLatestOpeningOnLocalCalendarDay(
  latestDateIso: string | null | undefined,
  ref: Date,
): boolean {
  const key = localCalendarKeyFromIso(latestDateIso ?? null);
  if (!key) return false;
  return key === localCalendarKey(startOfLocalDay(ref));
}

/**
 * Khui chỉ theo ngày thực tế: không trước hôm nay, không sau hôm nay.
 * Trả về thông báo lỗi hoặc null nếu hợp lệ.
 */
export function assertKhuiDateIsToday(khuiDate: Date, now: Date = new Date()): string | null {
  const k = startOfLocalDay(khuiDate).getTime();
  const t = startOfLocalDay(now).getTime();
  if (k < t) return "Không được chọn ngày khui trước hôm nay.";
  if (k > t) return "Không được chọn ngày khui sau hôm nay (chỉ khui theo ngày thực tế).";
  return null;
}

const TIMEZONE_VN = "Asia/Ho_Chi_Minh";

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

/** Ngày lịch (YYYY-MM-DD) theo múi giờ Việt Nam — tránh lệch ngày khi so khớp phiếu tạm thu với DB UTC. */
export function hoChiMinhCalendarKeyFromDate(d: Date): string {
  if (!isValidDate(d)) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_VN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function hoChiMinhCalendarKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (!isValidDate(date)) return null;
  const key = hoChiMinhCalendarKeyFromDate(date);
  return key || null;
}

function hoChiMinhCalendarDayDiffDays(keyA: string, keyB: string): number {
  const [ya, ma, da] = keyA.split("-").map(Number);
  const [yb, mb, db] = keyB.split("-").map(Number);
  const ta = Date.UTC(ya, ma - 1, da);
  const tb = Date.UTC(yb, mb - 1, db);
  return Math.round((ta - tb) / 86400000);
}

/**
 * Phiếu tạm thu: dây có kỳ khui mới nhất trùng **hôm nay (lịch VN)**,
 * hoặc **cùng số kỳ** với ít nhất một dây như vậy và ngày khui lệch tối đa ±7 ngày (lịch VN)
 * — để không thiếu dây do lệch ngày lưu DB / múi giờ.
 *
 * Nếu **không** có dây nào (trong danh sách đang xét) khui đúng ngày hôm nay (VN), vẫn lấy các dây
 * có ngày khui mới nhất trong **±7 ngày lịch VN** quanh hôm nay — tránh phiếu trống sang ngày hôm sau
 * khi hôm qua đã khui mà hôm nay chưa có kỳ mới / chưa ai khui.
 */
export function filterRowsForPhieuTamThu<
  T extends { latestDate: string | null; latestKy: number | null },
>(displayRows: T[], now: Date = new Date()): T[] {
  const todayKey = hoChiMinhCalendarKeyFromDate(now);
  const rowsToday = displayRows.filter((r) => hoChiMinhCalendarKeyFromIso(r.latestDate) === todayKey);
  const kyToday = new Set(
    rowsToday.map((r) => r.latestKy).filter((k): k is number => k != null && k > 0),
  );

  const withinSevenDaysOfToday = (r: T): boolean => {
    const k = hoChiMinhCalendarKeyFromIso(r.latestDate);
    if (!k) return false;
    return Math.abs(hoChiMinhCalendarDayDiffDays(k, todayKey)) <= 7;
  };

  if (rowsToday.length === 0) {
    return displayRows.filter(withinSevenDaysOfToday);
  }

  return displayRows.filter((r) => {
    const k = hoChiMinhCalendarKeyFromIso(r.latestDate);
    if (!k) return false;
    if (k === todayKey) return true;
    if (r.latestKy != null && kyToday.has(r.latestKy)) {
      return Math.abs(hoChiMinhCalendarDayDiffDays(k, todayKey)) <= 7;
    }
    return false;
  });
}
