/** Chuẩn hóa số điện thoại VN → dạng path zalo.me (84xxxxxxxxx). */
export function zaloMePathFromPhone(phoneRaw: string): string | null {
  const d = phoneRaw.replace(/\D/g, "");
  if (d.length < 9) return null;
  let n = d;
  if (n.startsWith("84")) {
    /* giữ */
  } else if (n.startsWith("0")) {
    n = `84${n.slice(1)}`;
  } else {
    n = `84${n}`;
  }
  return n;
}

export function zaloChatWebUrl(phoneRaw: string): string | null {
  const path = zaloMePathFromPhone(phoneRaw);
  return path ? `https://zalo.me/${path}` : null;
}
