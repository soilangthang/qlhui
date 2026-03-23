import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { cache } from "react";

import { getAuthPayloadFromCookie } from "@/lib/auth";
import { isChuHuiTrialBlocked } from "@/lib/chu-hui-trial";
import { logPerf, perfNowMs } from "@/lib/perf-log";
import { prisma } from "@/lib/prisma";

const getUserScopeRowById = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, rule: true, createdAt: true, chuHuiAccessUnlocked: true },
  });
});

/** Trang chủ hụi: đã đăng nhập, không phải admin, còn dùng thử hoặc đã mở khóa. */
export async function assertChuHuiUserId(): Promise<string> {
  const t0 = perfNowMs();
  const p = await getAuthPayloadFromCookie();
  if (!p?.sub) redirect("/login");
  if (p.rule === "admin") redirect("/quan-tri");

  // cache() giúp tránh query user lặp lại trong cùng vòng render/request.
  const row = await getUserScopeRowById(p.sub);
  if (!row || row.rule !== "user") redirect("/login");
  if (isChuHuiTrialBlocked(row)) redirect("/het-han-dung-thu");

  logPerf("assertChuHuiUserId", t0, `userId=${p.sub}`);
  return p.sub;
}

export async function requireChuHuiUserForApi(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const t0 = perfNowMs();
  const p = await getAuthPayloadFromCookie();
  if (!p?.sub) {
    return { ok: false, response: NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 }) };
  }
  if (p.rule === "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message:
            "Tài khoản admin chỉ quản lý người dùng trên trang Quản trị, không truy cập dữ liệu chủ hụi.",
        },
        { status: 403 },
      ),
    };
  }

  const row = await getUserScopeRowById(p.sub);
  if (!row || row.rule !== "user") {
    return { ok: false, response: NextResponse.json({ message: "Tài khoản không hợp lệ" }, { status: 403 }) };
  }
  if (isChuHuiTrialBlocked(row)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message:
            "Đã hết thời gian dùng thử (10 ngày). Vui lòng liên hệ admin để mở khóa tài khoản.",
          code: "CHU_HUI_TRIAL_EXPIRED",
        },
        { status: 403 },
      ),
    };
  }

  logPerf("requireChuHuiUserForApi", t0, `userId=${p.sub}`);
  return { ok: true, userId: p.sub };
}
