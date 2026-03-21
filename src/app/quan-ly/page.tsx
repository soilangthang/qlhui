import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/logout-button";
import { getAuthPayloadFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function QuanLyPage() {
  const payload = await getAuthPayloadFromCookie();
  if (!payload?.sub) {
    redirect("/login");
  }

  if (payload.rule === "admin") {
    redirect("/quan-tri");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { name: true, phone: true, rule: true, date: true },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-2xl rounded-2xl border border-blue-100 bg-white p-8 shadow-[0_10px_40px_-16px_rgba(30,64,175,0.35)]">
        <h1 className="text-3xl font-bold text-slate-900">Trang quản lý</h1>
        <p className="mt-2 text-slate-600">Khu vực dành cho tài khoản thường.</p>

        <div className="mt-6 rounded-xl bg-blue-50 p-4 text-slate-700">
          <p>
            Xin chào <span className="font-semibold">{user.name}</span>
          </p>
          <p>Số điện thoại: {user.phone}</p>
          <p>Vai trò: {user.rule}</p>
        </div>

        <div className="mt-6 flex gap-3">
          <Link className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700" href="/">
            Về trang chủ
          </Link>
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
