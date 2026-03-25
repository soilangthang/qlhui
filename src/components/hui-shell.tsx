"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import LogoutButton from "@/components/logout-button";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { CHU_HUI_TRIAL_DAYS } from "@/lib/chu-hui-trial";

type UserProfile = { name: string; phone: string; rule: string };

type MeAccess = {
  locked: boolean;
  unlocked: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysLeftUntil(iso: string): number {
  const end = new Date(iso).getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / MS_PER_DAY));
}

function formatDateViFromIso(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const menus = [
  { href: "/dashboard", label: "Trang chủ" },
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
  const [access, setAccess] = useState<MeAccess | null>(null);
  /** Tăng định kỳ để đếm ngày dùng thử cập nhật (qua ngày / đổi tab). */
  const [trialTick, setTrialTick] = useState(0);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = await res.json();
        setUser(data.user ?? null);
        setAccess((data.access as MeAccess | undefined) ?? null);
      } catch {
        setUser(null);
        setAccess(null);
      }
    }
    void loadProfile();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTrialTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onFocus() {
      setTrialTick((n) => n + 1);
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const trialDaysLeft = useMemo(() => {
    if (!access?.trialEndsAt || access.unlocked || user?.rule !== "user") return null;
    return daysLeftUntil(access.trialEndsAt);
  }, [access, user?.rule, trialTick]);

  return (
    <main className="min-h-screen min-w-0 w-full bg-gradient-to-b from-slate-50 via-white to-sky-50 print:min-h-0 print:h-auto print:bg-white print:p-0">
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
              <div className="max-w-[min(20rem,calc(100vw-5rem))] text-right leading-tight sm:max-w-lg">
                <p className="text-xs text-amber-100 sm:text-sm">
                  Chào Chủ Hụi : <span className="font-bold text-white">{user.name}</span>
                </p>
                {user.rule === "user" && access && !access.unlocked && !access.locked && trialDaysLeft !== null ? (
                  <p className="mt-0.5 text-[11px] font-semibold text-amber-200/95 sm:text-xs">
                    Dùng thử {CHU_HUI_TRIAL_DAYS} ngày — còn{" "}
                    <span className="tabular-nums text-amber-50">{trialDaysLeft}</span> ngày · Hết hạn{" "}
                    <span className="tabular-nums text-white">
                      {access.trialEndsAt ? formatDateViFromIso(access.trialEndsAt) : "—"}
                    </span>
                  </p>
                ) : null}
                {user.rule === "user" && access?.unlocked ? (
                  <p className="mt-0.5">
                    <span className="inline-flex items-center rounded-full border border-amber-400/45 bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-100 sm:text-[11px]">
                      Pro
                    </span>
                  </p>
                ) : null}
                {user.rule === "user" && access?.locked ? (
                  <p className="mt-0.5 text-[11px] font-semibold text-rose-300 sm:text-xs">
                    Đã hết thời gian dùng thử — liên hệ admin để mở khóa
                  </p>
                ) : null}
              </div>
              <LogoutButton className="px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm" />
            </div>
          ) : null}
        </div>
      </header>
      {user?.rule === "user" && access && !access.unlocked && !access.locked && trialDaysLeft !== null ? (
        <div className="border-b border-amber-500/30 bg-gradient-to-r from-amber-900/90 via-amber-800/85 to-amber-900/90 print:hidden">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5">
            <p className="text-xs font-medium text-amber-50 sm:text-sm">
              <span className="font-bold text-white">Gói dùng thử {CHU_HUI_TRIAL_DAYS} ngày:</span> còn lại{" "}
              <span className="inline-flex min-w-[1.25rem] justify-center rounded bg-white/15 px-1.5 py-0.5 font-extrabold tabular-nums text-white">
                {trialDaysLeft}
              </span>{" "}
              ngày (đếm ngược theo ngày). Ngày hết hạn:{" "}
              <span className="font-semibold tabular-nums text-amber-100">
                {access.trialEndsAt ? formatDateViFromIso(access.trialEndsAt) : "—"}
              </span>
              .
            </p>
            <Link
              href="/lien-he"
              className="shrink-0 text-xs font-semibold text-amber-200 underline-offset-2 hover:text-white hover:underline sm:text-sm"
            >
              Cần gia hạn? Liên hệ
            </Link>
          </div>
        </div>
      ) : null}
      <div className="min-w-0 max-w-full px-2 py-6 pb-24 md:px-4 md:py-8 lg:pb-8 print:p-0">
      <section className="mx-auto grid min-w-0 w-full max-w-[1400px] gap-6 lg:grid-cols-[250px_minmax(0,1fr)] print:grid-cols-1 print:gap-0 print:min-h-0">
        <aside className="hidden h-fit rounded-2xl border border-slate-300 bg-white p-4 shadow-sm print:hidden lg:block">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Chức năng chính</p>
          <nav className="mt-3 space-y-2">
            {menus.map((menu) => {
              const active = pathname === menu.href;
              const disablePrefetch =
                menu.href === "/thu-tien" || menu.href === "/chi-tiet-hui-vien";
              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  prefetch={disablePrefetch ? false : undefined}
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

        <section className="min-h-[calc(100vh-8rem)] min-w-0 max-w-full print:min-h-0 print:h-auto">{children}</section>
      </section>
      </div>
      <MobileBottomNav key={pathname} pathname={pathname} />
    </main>
  );
}
