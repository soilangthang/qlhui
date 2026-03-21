import { redirect } from "next/navigation";

import { getAuthPayloadFromCookie } from "@/lib/auth";

/** Server: chỉ admin; không phải → về dashboard. Chưa đăng nhập → login. */
export async function assertAdminOrRedirect() {
  const payload = await getAuthPayloadFromCookie();
  if (!payload?.sub) {
    redirect("/login");
  }
  if (payload.rule !== "admin") {
    redirect("/dashboard");
  }
  return payload;
}

export async function getAdminPayloadOrNull() {
  const payload = await getAuthPayloadFromCookie();
  if (!payload?.sub || payload.rule !== "admin") return null;
  return payload;
}
