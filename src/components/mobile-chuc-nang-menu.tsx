import {
  DashboardStripeFrame,
  dashboardStripeCaptionClass,
  dashboardStripeTitleClass,
  dashboardStripeValueClass,
} from "@/components/dashboard-summary-cards";

const sectionLabel = "px-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#7f8c8d]";

function IconWhiteEye() {
  return (
    <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconWhiteChart() {
  return (
    <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 19V5M8 19V9M12 19v-6M16 19v-3M20 19V7" strokeLinecap="round" />
    </svg>
  );
}

function IconWhiteGear() {
  return (
    <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
    </svg>
  );
}

function IconWhitePhone() {
  return (
    <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Trang /cac-chuc-nang — card cùng phong cách stripe màu trang chủ. */
export default function MobileChucNangMenu({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-5 ${className}`}>
      <div className="space-y-3">
        <p className={sectionLabel}>Theo dõi và báo cáo</p>
        <DashboardStripeFrame
          href="/theo-doi"
          surfaceClass="bg-gradient-to-r from-emerald-500 to-emerald-600"
          iconRailClass="bg-emerald-900/35"
          icon={<IconWhiteEye />}
        >
          <p className={dashboardStripeTitleClass}>Theo dõi đóng tiền</p>
          <p className={`${dashboardStripeValueClass} truncate`}>Theo dõi</p>
          <p className={dashboardStripeCaptionClass}>(Đánh dấu hụi viên đã đóng)</p>
        </DashboardStripeFrame>
        <DashboardStripeFrame
          href="/bao-cao"
          surfaceClass="bg-gradient-to-r from-violet-500 to-violet-600"
          iconRailClass="bg-violet-900/35"
          icon={<IconWhiteChart />}
        >
          <p className={dashboardStripeTitleClass}>Báo cáo tổng hợp</p>
          <p className={`${dashboardStripeValueClass} truncate`}>Báo cáo</p>
          <p className={dashboardStripeCaptionClass}>(Theo dây và hụi viên)</p>
        </DashboardStripeFrame>
      </div>
      <div className="space-y-3">
        <p className={sectionLabel}>Hệ thống</p>
        <DashboardStripeFrame
          href="/cai-dat"
          surfaceClass="bg-gradient-to-r from-orange-400 to-orange-500"
          iconRailClass="bg-orange-900/35"
          icon={<IconWhiteGear />}
        >
          <p className={dashboardStripeTitleClass}>Cài đặt ứng dụng</p>
          <p className={`${dashboardStripeValueClass} truncate`}>Cài đặt</p>
          <p className={dashboardStripeCaptionClass}>(Phiếu in, QR, ghi chú)</p>
        </DashboardStripeFrame>
        <DashboardStripeFrame
          href="/lien-he"
          surfaceClass="bg-gradient-to-r from-slate-600 to-slate-700"
          iconRailClass="bg-slate-900/40"
          icon={<IconWhitePhone />}
        >
          <p className={dashboardStripeTitleClass}>Liên hệ hỗ trợ</p>
          <p className={`${dashboardStripeValueClass} truncate`}>Liên hệ</p>
          <p className={dashboardStripeCaptionClass}>(Zalo admin, gia hạn)</p>
        </DashboardStripeFrame>
      </div>
    </div>
  );
}
