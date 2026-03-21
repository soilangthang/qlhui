/** Ghi chú chân: `memberId:<cuid>` khi gán từ danh sách hụi viên. */
export function parseMemberIdFromNote(note: string | null) {
  if (!note) return null;
  if (!note.startsWith("memberId:")) return null;
  return note.slice("memberId:".length) || null;
}

/** Khóa ổn định để lưu đánh dấu theo kỳ (gom nhiều chân cùng một hụi viên). */
export function memberTrackingKeyFromLeg(leg: {
  note: string | null;
  memberName: string | null;
  memberPhone: string | null;
}): string | null {
  const memberId = parseMemberIdFromNote(leg.note);
  if (memberId) return `id:${memberId}`;
  const n = (leg.memberName ?? "").trim();
  const p = (leg.memberPhone ?? "").trim();
  if (!n && !p) return null;
  return `np:${n}|${p}`;
}
