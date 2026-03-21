/** Mẫu ghi chú khi chưa cấu hình hoặc để trống trong Cài đặt. */
export const DEFAULT_PHIEU_GHI_CHU_LINES = [
  "❌ MN đóng hụi trước 17h cùng ngày.",
  "Trễ nhất là 20h + 20k phạt.",
  "❌ Hụi em không chằng qua ngày với bất kì lí do gì.",
  "❌ Nhắc nhở 3 lần ngưng nhận thăm hụi.",
  "🌺 Cảm ơn cả nhà đã tin tưởng hợp tác.",
] as const;

export function slipNoteLinesFromSetting(raw: string | null | undefined): string[] {
  const t = (raw ?? "").trim();
  if (!t) return [...DEFAULT_PHIEU_GHI_CHU_LINES];
  return t
    .split(/\r?\n/)
    .map((s) => s.trimEnd())
    .filter((s) => s.length > 0);
}
