import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth-constants";

type JwtPayload = { sub?: string; rule?: string };

function jsonForbidden(message = "Không có quyền") {
  return NextResponse.json({ message }, { status: 403 });
}

function jsonUnauthorized() {
  return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
}

async function readAuth(request: NextRequest): Promise<
  | { ok: true; sub: string; rule: string }
  | { ok: false; reason: "missing_secret" | "no_token" | "invalid" }
> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("middleware: JWT_SECRET missing");
    return { ok: false, reason: "missing_secret" };
  }
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return { ok: false, reason: "no_token" };
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    const p = payload as JwtPayload;
    const sub = typeof p.sub === "string" ? p.sub : "";
    const rule = typeof p.rule === "string" ? p.rule : "";
    if (!sub) return { ok: false, reason: "invalid" };
    return { ok: true, sub, rule };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

const CHU_HUI_ME_FETCH_MS = 2500;

/**
 * null = không xác định — không ép redirect.
 * Có timeout để tránh treo vĩnh viễn: gọi nội bộ /api trong middleware trên dev đôi khi deadlock (request chờ middleware, middleware chờ API).
 */
async function fetchChuHuiAccessLocked(request: NextRequest): Promise<boolean | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHU_HUI_ME_FETCH_MS);
  try {
    const url = new URL("/api/auth/me", request.nextUrl.origin);
    const res = await fetch(url, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = (await res.json()) as { access?: { locked?: boolean } };
    if (data.access?.locked === true) return true;
    if (data.access?.locked === false) return false;
    return null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

function isAdminRoute(path: string) {
  return path.startsWith("/quan-tri") || path.startsWith("/api/admin");
}

/** Cho phép khi hết dùng thử (vẫn đăng nhập) để xem trang liên hệ. */
function isChuHuiPathAllowedWhenTrialLocked(path: string) {
  return path === "/lien-he" || path.startsWith("/lien-he/");
}

function isChuHuiRoute(path: string) {
  if (path === "/" || path === "/dashboard" || path.startsWith("/dashboard/")) return true;
  const roots = [
    "/day-hui",
    "/hui-vien",
    "/cai-dat",
    "/bao-cao",
    "/theo-doi",
    "/thu-tien",
    "/chi-tiet-hui-vien",
    "/lien-he",
    "/quan-ly",
    "/cac-chuc-nang",
  ];
  for (const r of roots) {
    if (path === r || path.startsWith(`${r}/`)) return true;
  }
  if (path.startsWith("/api/day-hui")) return true;
  if (path.startsWith("/api/hui-vien")) return true;
  if (path === "/api/cai-dat" || path.startsWith("/api/cai-dat/")) return true;
  if (path.startsWith("/api/theo-doi")) return true;
  if (path.startsWith("/api/thu-tien")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isApi = path.startsWith("/api/");

  if (path.startsWith("/api/auth") || path === "/login" || path === "/register") {
    return NextResponse.next();
  }

  const redirectLogin = () => NextResponse.redirect(new URL("/login", request.url));
  const redirectQuanTri = () => NextResponse.redirect(new URL("/quan-tri", request.url));
  const redirectDash = () => NextResponse.redirect(new URL("/dashboard", request.url));
  const redirectHetHan = () => NextResponse.redirect(new URL("/het-han-dung-thu", request.url));

  if (path === "/het-han-dung-thu") {
    const auth = await readAuth(request);
    if (!auth.ok) {
      if (auth.reason === "missing_secret") {
        return isApi
          ? NextResponse.json({ message: "Lỗi cấu hình máy chủ" }, { status: 500 })
          : redirectLogin();
      }
      return redirectLogin();
    }
    if (auth.rule === "admin") return redirectQuanTri();
    const locked = await fetchChuHuiAccessLocked(request);
    if (locked === false) return redirectDash();
    return NextResponse.next();
  }

  if (!isAdminRoute(path) && !isChuHuiRoute(path)) {
    return NextResponse.next();
  }

  const auth = await readAuth(request);

  if (!auth.ok) {
    if (auth.reason === "missing_secret") {
      return isApi
        ? NextResponse.json({ message: "Lỗi cấu hình máy chủ" }, { status: 500 })
        : redirectLogin();
    }
    if (isApi && isAdminRoute(path)) return jsonForbidden();
    if (isApi && isChuHuiRoute(path)) return jsonUnauthorized();
    return redirectLogin();
  }

  if (isAdminRoute(path)) {
    if (auth.rule !== "admin") {
      return isApi ? jsonForbidden() : redirectDash();
    }
    return NextResponse.next();
  }

  if (auth.rule === "admin") {
    return isApi
      ? jsonForbidden("Admin không truy cập được dữ liệu chủ hụi.")
      : redirectQuanTri();
  }

  if (!isApi && !isChuHuiPathAllowedWhenTrialLocked(path)) {
    const locked = await fetchChuHuiAccessLocked(request);
    if (locked === true) return redirectHetHan();
  }

  /** Tránh phụ thuộc redirect() trong RSC gốc — một số bản Turbopack có thể render trắng khi chỉ redirect ở page. */
  if (path === "/" && !isApi) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard",
    "/dashboard/:path*",
    "/day-hui",
    "/day-hui/:path*",
    "/hui-vien",
    "/hui-vien/:path*",
    "/cai-dat",
    "/cai-dat/:path*",
    "/bao-cao",
    "/bao-cao/:path*",
    "/theo-doi",
    "/theo-doi/:path*",
    "/thu-tien",
    "/thu-tien/:path*",
    "/chi-tiet-hui-vien",
    "/chi-tiet-hui-vien/:path*",
    "/lien-he",
    "/lien-he/:path*",
    "/cac-chuc-nang",
    "/cac-chuc-nang/:path*",
    "/quan-ly",
    "/quan-ly/:path*",
    "/het-han-dung-thu",
    "/quan-tri",
    "/quan-tri/:path*",
    "/api/admin/:path*",
    "/api/day-hui",
    "/api/day-hui/:path*",
    "/api/hui-vien",
    "/api/hui-vien/:path*",
    "/api/cai-dat",
    "/api/theo-doi",
    "/api/theo-doi/:path*",
    "/api/thu-tien",
    "/api/thu-tien/:path*",
  ],
};
