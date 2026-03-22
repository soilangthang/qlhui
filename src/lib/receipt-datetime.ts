/** Hiển thị thời gian trên phiếu — múi giờ VN cố định. */
export const RECEIPT_TIMEZONE = "Asia/Ho_Chi_Minh";

/** Chỉ ngày (dd/mm/yyyy) — dùng cho ngày mở hụi / ngày hốt khi DB chỉ lưu ngày lịch (nửa đêm). */
export function formatViCalendarDate(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return typeof isoOrDate === "string" ? isoOrDate : "";
  return d.toLocaleDateString("vi-VN", {
    timeZone: RECEIPT_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Ngày giờ đầy đủ tại thời điểm hiện tại (phiếu tạm tính, ngày giao, v.v.). */
export function formatViDateTime(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    timeZone: RECEIPT_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
