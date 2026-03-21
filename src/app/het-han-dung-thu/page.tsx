import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/logout-button";
import { getAuthPayloadFromCookie } from "@/lib/auth";
import { chuHuiTrialEndsAt, isChuHuiTrialBlocked } from "@/lib/chu-hui-trial";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Hết hạn dùng thử",
};

function formatDateVi(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HetHanDungThuPage() {
  const p = await getAuthPayloadFromCookie();
  if (!p?.sub) redirect("/login");
  if (p.rule === "admin") redirect("/quan-tri");

  const user = await prisma.user.findUnique({
    where: { id: p.sub },
    select: {
      name: true,
      phone: true,
      rule: true,
      createdAt: true,
      chuHuiAccessUnlocked: true,
    },
  });
  if (!user || user.rule !== "user") redirect("/login");

  if (!isChuHuiTrialBlocked(user)) {
    redirect("/dashboard");
  }

  const hetHan = chuHuiTrialEndsAt(user.createdAt).toISOString();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-indigo-50/50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 shadow-xl shadow-amber-100/40">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-700">TS QUẢN LÝ</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Hết thời gian dùng thử</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Tài khoản chủ hụi <span className="font-semibold text-slate-900">{user.name}</span> (
          {user.phone}) đã quá <span className="font-semibold">10 ngày</span> dùng thử (kết thúc lúc{" "}
          <span className="font-medium text-slate-800">{formatDateVi(hetHan)}</span>).
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Để tiếp tục sử dụng, vui lòng liên hệ <span className="font-semibold">admin hệ thống</span> để được mở khóa
          tài khoản.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <LogoutButton className="w-full justify-center px-4 py-2.5 text-sm sm:w-auto" />
          <Link
            href="/lien-he"
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 sm:w-auto"
          >
            Liên hệ
          </Link>
        </div>
      </div>
    </main>
  );
}
