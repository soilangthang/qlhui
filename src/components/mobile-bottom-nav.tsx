"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
  icon: (active: boolean) => ReactNode;
};

const amberActive = "text-amber-500";
const muted = "text-slate-600";

function IconHome({ active }: { active: boolean }) {
  const c = active ? amberActive : muted;
  return (
    <svg className={`mx-auto h-6 w-6 ${c}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function IconUsers({ active }: { active: boolean }) {
  const c = active ? amberActive : muted;
  return (
    <svg className={`mx-auto h-6 w-6 ${c}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconLayers({ active }: { active: boolean }) {
  const c = active ? amberActive : muted;
  return (
    <svg className={`mx-auto h-6 w-6 ${c}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function IconWallet({ active }: { active: boolean }) {
  const c = active ? amberActive : muted;
  return (
    <svg className={`mx-auto h-6 w-6 ${c}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 1 0 0 4h4v-4h-4Z" />
    </svg>
  );
}

function IconListUser({ active }: { active: boolean }) {
  const c = active ? amberActive : muted;
  return (
    <svg className={`mx-auto h-6 w-6 ${c}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function IconGrid({ active }: { active: boolean }) {
  const c = active ? amberActive : muted;
  return (
    <svg className={`mx-auto h-6 w-6 ${c}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

const items: NavItem[] = [
  {
    href: "/dashboard",
    label: "Trang chủ",
    match: (p) => p === "/dashboard" || p === "/",
    icon: (a) => <IconHome active={a} />,
  },
  {
    href: "/hui-vien",
    label: "Hụi viên",
    match: (p) => p === "/hui-vien",
    icon: (a) => <IconUsers active={a} />,
  },
  {
    href: "/day-hui",
    label: "Dây hụi",
    match: (p) => p.startsWith("/day-hui"),
    icon: (a) => <IconLayers active={a} />,
  },
  {
    href: "/thu-tien",
    label: "Thu tiền",
    match: (p) => p.startsWith("/thu-tien"),
    icon: (a) => <IconWallet active={a} />,
  },
  {
    href: "/chi-tiet-hui-vien",
    label: "Chi tiết Hụi viên",
    match: (p) => p.startsWith("/chi-tiet-hui-vien"),
    icon: (a) => <IconListUser active={a} />,
  },
];

function moreTabActive(pathname: string) {
  if (pathname === "/cac-chuc-nang" || pathname.startsWith("/cac-chuc-nang/")) return true;
  return ["/theo-doi", "/bao-cao", "/cai-dat", "/lien-he"].some(
    (h) => pathname === h || pathname.startsWith(`${h}/`),
  );
}

export default function MobileBottomNav({ pathname }: { pathname: string }) {
  const moreActive = moreTabActive(pathname);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(15,23,42,0.06)] lg:hidden print:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      aria-label="Điều hướng chính"
    >
      <div className="mx-auto flex min-w-0 max-w-full">
          {items.map((item) => {
            const active = item.match(pathname);
            const disablePrefetch = item.href === "/thu-tien" || item.href === "/chi-tiet-hui-vien";
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={disablePrefetch ? false : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-2 outline-none ring-amber-400/50 focus-visible:ring-2 ${
                  active ? "bg-amber-50/80" : "active:bg-slate-50"
                }`}
              >
                {item.icon(active)}
                <span
                  className={`w-full max-w-full truncate px-0.5 text-center text-[0.55rem] font-semibold leading-[1.1] sm:text-[0.6rem] md:text-[0.65rem] ${
                    active ? "text-amber-600" : "text-slate-600"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        <Link
          href="/cac-chuc-nang"
          className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-2 outline-none ring-amber-400/50 focus-visible:ring-2 ${
            moreActive ? "bg-amber-50/80" : "active:bg-slate-50"
          }`}
        >
          <IconGrid active={moreActive} />
          <span
            className={`w-full max-w-full truncate px-0.5 text-center text-[0.55rem] font-semibold leading-[1.1] sm:text-[0.6rem] md:text-[0.65rem] ${
              moreActive ? "text-amber-600" : "text-slate-600"
            }`}
          >
            Các chức năng
          </span>
        </Link>
      </div>
    </nav>
  );
}
