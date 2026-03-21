"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import LogoutButton from "@/components/logout-button";

type UserProfile = { name: string; phone: string; rule: string };

const menus = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/hui-vien", label: "Hụi Viên" },
  { href: "/day-hui", label: "Dây Hụi" },
  { href: "/thu-tien", label: "Thu tiền" },
  { href: "/chi-tiet-hui-vien", label: "Chi tiết Hụi viên" },
  { href: "/theo-doi", label: "Theo dõi" },
  { href: "/bao-cao", label: "Báo cáo" },
  { href: "/cai-dat", label: "Cài đặt" },
  { href: "/lien-he", label: "Liên hệ" },
];

export default function HuiShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = await res.json();
        setUser(data.user ?? null);
      } catch {
        setUser(null);
      }
    }
    void loadProfile();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-sky-50 print:min-h-0 print:h-auto print:bg-white print:p-0">
      <header className="border-b border-amber-900/25 bg-slate-950 shadow-md print:hidden">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-3 py-2.5 sm:px-5 sm:py-3">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2 sm:gap-3 rounded-xl outline-none ring-amber-400/40 transition hover:opacity-95 focus-visible:ring-2"
          >
            <Image
              src="/app-logo.png"
              alt="TS QUẢN LÝ"
              width={52}
              height={52}
              className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-lg ring-1 ring-amber-500/20 sm:h-[52px] sm:w-[52px]"
              priority
            />
            <span className="truncate text-base font-extrabold tracking-tight text-amber-100 sm:text-xl">
              TS QUẢN LÝ
            </span>
          </Link>
          {user ? (
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <div className="max-w-[min(100vw-12rem,320px)] truncate text-right leading-tight sm:max-w-md">
                <p className="text-xs text-amber-100 sm:text-sm">
                  Chào Chủ Hụi : <span className="font-bold text-white">{user.name}</span>
                </p>
              </div>
              <LogoutButton className="px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm" />
            </div>
          ) : null}
        </div>
      </header>
      <div className="px-2 py-6 md:px-4 md:py-8 print:p-0">
      <section className="mx-auto grid w-full max-w-[1400px] gap-6 lg:grid-cols-[250px_minmax(0,1fr)] print:grid-cols-1 print:gap-0 print:min-h-0">
        <aside className="h-fit rounded-2xl border border-slate-300 bg-white p-4 shadow-sm print:hidden">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Chức năng chính</p>
          <nav className="mt-3 space-y-2">
            {menus.map((menu) => {
              const active = pathname === menu.href;
              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold ${
                    active
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {menu.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-h-[calc(100vh-8rem)] print:min-h-0 print:h-auto">{children}</section>
      </section>
      </div>
    </main>
  );
}
