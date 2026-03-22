import Link from "next/link";
import type { ReactNode } from "react";

/** Tiêu đề / giá trị chữ trắng — dùng trong card màu (cùng hệ 4 card trên). */
export const dashboardStripeTitleClass =
  "text-[0.65rem] font-bold uppercase leading-tight tracking-wide text-white/95 sm:text-[0.7rem]";
export const dashboardStripeValueClass =
  "mt-1.5 text-2xl font-bold leading-none text-white sm:text-3xl";
export const dashboardStripeCaptionClass = "mt-1 text-xs font-medium text-white/90 sm:text-sm";
export const dashboardStripeMutedClass = "mt-2 text-sm leading-relaxed text-white/85";

export function DashboardStripeFrame({
  href,
  surfaceClass,
  iconRailClass,
  icon,
  children,
}: {
  href?: string;
  surfaceClass: string;
  iconRailClass: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const shell = `flex w-full min-h-[5.5rem] overflow-hidden rounded-2xl shadow-md ring-1 ring-black/10 ${surfaceClass} ${
    href
      ? "transition hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
      : ""
  }`;
  const body = (
    <>
      <div
        className={`flex w-[4.5rem] shrink-0 items-center justify-center sm:w-[5.25rem] ${iconRailClass}`}
        aria-hidden
      >
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-3.5 sm:px-4">{children}</div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}

function IconBuilding() {
  return (
    <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 21V8l8-5 8 5v13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 10h.01M12 10h.01M15 10h.01M9 14h.01M12 14h.01M15 14h.01" strokeLinecap="round" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" strokeLinecap="round" />
    </svg>
  );
}

function IconCalendarUser() {
  return (
    <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" strokeLinecap="round" />
      <circle cx="12" cy="16" r="2.5" />
      <path d="M8 21c.8-2 2.4-3 4-3s3.2 1 4 3" strokeLinecap="round" />
    </svg>
  );
}

/** Icon stripe — card “Chờ giao tiền”. */
export function IconStripeCashHandoff() {
  return (
    <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 11V3H8.5a2.5 2.5 0 0 0 0 5H12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8h3.5a2.5 2.5 0 0 1 0 5H12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16v5M9 21h6" strokeLinecap="round" />
    </svg>
  );
}

/** Dây & kỳ gần nhất. */
export function IconStripeTimeline() {
  return (
    <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconStripeTrendIn() {
  return (
    <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 17 9 11l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 7h7v7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconStripeTrendOut() {
  return (
    <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M21 7 15 13l-4-4-8 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 17H3v-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconStripeCoins() {
  return (
    <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v6c0 1.66 3.13 3 7 3s7-1.34 7-3V5" />
      <path d="M5 11v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
    </svg>
  );
}

function SummaryCard({
  href,
  bgClass,
  iconRailClass,
  icon,
  title,
  value,
  sub,
}: {
  href: string;
  bgClass: string;
  iconRailClass: string;
  icon: ReactNode;
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <DashboardStripeFrame href={href} surfaceClass={bgClass} iconRailClass={iconRailClass} icon={icon}>
      <p className={dashboardStripeTitleClass}>{title}</p>
      <p className={`${dashboardStripeValueClass} truncate`}>{value}</p>
      {sub ? <p className={dashboardStripeCaptionClass}>({sub})</p> : null}
    </DashboardStripeFrame>
  );
}

export default function DashboardSummaryCards({
  quanLyDay,
  canDongTrongNgay,
  canKhuiHomNay,
  huiVienCount,
}: {
  quanLyDay: number;
  canDongTrongNgay: number;
  canKhuiHomNay: number;
  huiVienCount: number;
}) {
  const dayWord = (n: number) => `${n} dây`;

  return (
    <section className="grid gap-3 sm:gap-4">
      <SummaryCard
        href="/day-hui"
        bgClass="bg-gradient-to-r from-amber-400 to-amber-500"
        iconRailClass="bg-amber-700/35"
        icon={<IconBuilding />}
        title="Quản lý hụi"
        value={dayWord(quanLyDay)}
        sub="Đang hoạt động"
      />
      <SummaryCard
        href="/thu-tien"
        bgClass="bg-gradient-to-r from-emerald-500 to-emerald-600"
        iconRailClass="bg-emerald-800/35"
        icon={<IconCalendar />}
        title="Hụi cần đóng (trong ngày)"
        value={dayWord(canDongTrongNgay)}
        sub="Khui trong ngày"
      />
      <SummaryCard
        href="/day-hui"
        bgClass="bg-gradient-to-r from-orange-400 to-orange-500"
        iconRailClass="bg-orange-800/35"
        icon={<IconCalendar />}
        title="Hụi cần khui"
        value={dayWord(canKhuiHomNay)}
        sub="Ngày hôm nay"
      />
      <SummaryCard
        href="/hui-vien"
        bgClass="bg-gradient-to-r from-slate-600 to-slate-700"
        iconRailClass="bg-slate-900/40"
        icon={<IconCalendarUser />}
        title="Thông tin hụi viên"
        value={`${huiVienCount.toLocaleString("vi-VN")} người`}
        sub=""
      />
    </section>
  );
}
