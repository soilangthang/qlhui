import Link from "next/link";
import { unstable_cache } from "next/cache";

import DashboardSummaryCards, {
  DashboardStripeFrame,
  dashboardStripeCaptionClass,
  dashboardStripeMutedClass,
  dashboardStripeTitleClass,
  dashboardStripeValueClass,
  IconStripeCashHandoff,
  IconStripeCoins,
  IconStripeTimeline,
  IconStripeTrendIn,
  IconStripeTrendOut,
} from "@/components/dashboard-summary-cards";
import { assertChuHuiUserId } from "@/lib/chu-hui-scope";
import { addCycleFromDate } from "@/lib/hui-member-line-metrics";
import { hoChiMinhCalendarKeyFromDate, hoChiMinhCalendarKeyFromIso } from "@/lib/local-calendar";
import { logPerf, perfNowMs } from "@/lib/perf-log";
import { prisma } from "@/lib/prisma";

/** Card trắng — cùng phong cách dashboard (viền xám nhạt, bo góc). */
const dashCard =
  "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm";

const textMuted = "text-[#7f8c8d]";

function formatMoneyVN(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function formatDateVN(value: unknown) {
  const date =
    value instanceof Date ? value : typeof value === "string" || typeof value === "number" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "—";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/** Giống cột Trạng thái ở trang Dây hụi: đã khui → kỳ X/Y; chưa khui → Đang chờ. */
function lineStatusDisplay(line: { soChan: number; _count: { openings: number } }) {
  const opened = line._count.openings;
  if (opened > 0) {
    return { label: `Đang mở kỳ ${opened}/${line.soChan}`, variant: "open" as const };
  }
  return { label: "Đang chờ", variant: "wait" as const };
}

function toIsoString(input: unknown): string {
  if (input instanceof Date) return input.toISOString();
  if (typeof input === "string") {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  }
  return "";
}

const loadDashboardDataCached = unstable_cache(
  async (userId: string) => {
    const [huiMemberCount, choGiaoTien, lines, grossSum, paidOutSum, commissionRows, latestOpeningGlobal] =
      await Promise.all([
        prisma.huiMember.count({ where: { userId } }),
        prisma.huiOpening.findMany({
          where: { status: "CHO_GIAO_TIEN", huiLine: { userId } },
          orderBy: { ngayKhui: "desc" },
          take: 12,
          select: {
            id: true,
            kyThu: true,
            ngayKhui: true,
            winnerName: true,
            winnerPhone: true,
            finalPayout: true,
            huiLine: { select: { id: true, name: true } },
          },
        }),
        prisma.huiLine.findMany({
          where: { userId },
          orderBy: { createdAt: "asc" },
          include: {
            _count: { select: { legs: true, openings: true } },
            openings: {
              orderBy: { kyThu: "desc" },
              take: 1,
              select: { kyThu: true, ngayKhui: true },
            },
          },
        }),
        prisma.huiOpening.aggregate({
          where: { huiLine: { userId } },
          _sum: { grossPayout: true },
        }),
        prisma.huiOpening.aggregate({
          where: { status: "DA_GIAO_TIEN", huiLine: { userId } },
          _sum: { finalPayout: true },
        }),
        prisma.huiOpening.findMany({
          where: { huiLine: { userId } },
          select: { grossPayout: true, finalPayout: true },
        }),
        prisma.huiOpening.findFirst({
          where: { huiLine: { userId } },
          orderBy: [{ ngayKhui: "desc" }, { kyThu: "desc" }, { createdAt: "desc" }],
          select: {
            kyThu: true,
            ngayKhui: true,
            huiLine: { select: { name: true } },
          },
        }),
      ]);

    return {
      huiMemberCount,
      choGiaoTien,
      lines,
      grossSum,
      paidOutSum,
      commissionRows,
      latestOpeningGlobal,
    };
  },
  ["dashboard-page-data-v1"],
  { revalidate: 60, tags: ["dashboard-data"] },
);

export default async function DashboardPage() {
  const t0 = perfNowMs();
  const userId = await assertChuHuiUserId();
  const { huiMemberCount, choGiaoTien, lines, grossSum, paidOutSum, commissionRows, latestOpeningGlobal } =
    await loadDashboardDataCached(userId);

  const totalGross = Number(grossSum._sum.grossPayout ?? 0);
  const totalPaidOut = Number(paidOutSum._sum.finalPayout ?? 0);
  const tienCoLuyKe = commissionRows.reduce(
    (acc, o) => acc + Math.max(0, o.grossPayout - o.finalPayout),
    0,
  );

  const sapMo = lines.filter((l) => l.status === "SAP_MO");
  const dangChay = lines.filter((l) => l.status === "DANG_CHAY");
  /** Dây ưu tiên hiển thị khi chưa có kỳ khui nào (không dùng làm “kỳ mới nhất”). */
  const lineFallback = sapMo[0] ?? dangChay[0] ?? lines[0] ?? null;

  const todayKey = hoChiMinhCalendarKeyFromDate(new Date());
  /** Tổng dây đang quản lý (mọi trạng thái). */
  const quanLyDayTong = lines.length;
  const canDongTrongNgay = lines.filter((l) => {
    const latest = l.openings[0];
    if (!latest) return false;
    return hoChiMinhCalendarKeyFromIso(toIsoString(latest.ngayKhui)) === todayKey;
  }).length;
  const canKhuiHomNay = lines.filter((l) => {
    if (l._count.openings >= l.soChan) return false;
    const latest = l.openings[0];
    const nextDate = !latest ? l.ngayMo : addCycleFromDate(new Date(latest.ngayKhui), l.chuKy);
    return hoChiMinhCalendarKeyFromDate(nextDate) === todayKey;
  }).length;

  let nextKyLabel = "—";
  let nextKySub = "Chưa có dây hoặc chưa khui kỳ nào";
  if (latestOpeningGlobal) {
    nextKyLabel = formatDateVN(latestOpeningGlobal.ngayKhui);
    nextKySub = `${latestOpeningGlobal.huiLine.name} • Kỳ ${latestOpeningGlobal.kyThu} (mới nhất)`;
  } else if (lineFallback) {
    nextKyLabel = formatDateVN(lineFallback.ngayMo);
    nextKySub = `${lineFallback.name} • Ngày mở dây`;
  }

  logPerf("DashboardPage", t0, `userId=${userId} lines=${lines.length} choGiaoTien=${choGiaoTien.length}`);
  return (
      <div className="min-h-[calc(100vh-140px)]">
        <DashboardSummaryCards
          quanLyDay={quanLyDayTong}
          canDongTrongNgay={canDongTrongNgay}
          canKhuiHomNay={canKhuiHomNay}
          huiVienCount={huiMemberCount}
        />

        <section className="mt-3 grid gap-3 sm:mt-4 sm:gap-4">
          <DashboardStripeFrame
            surfaceClass="bg-gradient-to-r from-rose-500 to-rose-600"
            iconRailClass="bg-rose-900/35"
            icon={<IconStripeCashHandoff />}
          >
            <p className={dashboardStripeTitleClass}>Chờ giao tiền người hốt</p>
            <p className={dashboardStripeValueClass}>
              {choGiaoTien.length === 0 ? (
                <span className="text-xl font-bold text-emerald-100">Không có kỳ chờ</span>
              ) : (
                <>
                  {choGiaoTien.length} <span className="text-xl font-bold text-white/95">kỳ</span>
                </>
              )}
            </p>
            {choGiaoTien.length > 0 ? (
              <>
                <p className={dashboardStripeCaptionClass}>
                  Đã khui nhưng chủ hụi chưa bấm xác nhận đã giao tiền mặt.
                </p>
                <ul className="mt-3 max-h-52 space-y-2 overflow-y-auto text-left text-sm">
                  {choGiaoTien.map((o) => {
                    const phone = o.winnerPhone?.trim();
                    return (
                      <li
                        key={o.id}
                        className="rounded-xl bg-black/20 px-3 py-2.5 ring-1 ring-white/10"
                      >
                        <div className="font-medium text-white">
                          <span className="font-semibold">{o.winnerName || "Chưa rõ"}</span>
                          {phone ? <span className="text-white/80"> · {phone}</span> : null}
                        </div>
                        <p className="mt-0.5 text-xs text-white/80">
                          {o.huiLine.name} · Kỳ {o.kyThu} · {formatDateVN(o.ngayKhui)} ·{" "}
                          <span className="font-semibold text-white">{formatMoneyVN(o.finalPayout)}</span>
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <p className={dashboardStripeMutedClass}>
                  Mở <span className="font-semibold text-white">dây hụi</span> tương ứng → trang khui → bấm{" "}
                  <span className="font-semibold text-white">Xác nhận</span> sau khi đã giao tiền.{" "}
                  <Link href="/thu-tien" className="font-semibold text-white underline decoration-white/50 underline-offset-2 hover:decoration-white">
                    Thu tiền
                  </Link>
                </p>
              </>
            ) : (
              <p className={dashboardStripeMutedClass}>
                Khi có kỳ ở trạng thái &quot;chờ giao tiền&quot;, danh sách sẽ hiện tại đây.{" "}
                <Link href="/thu-tien" className="font-semibold text-white underline decoration-white/50 underline-offset-2 hover:decoration-white">
                  Mở thu tiền
                </Link>
              </p>
            )}
          </DashboardStripeFrame>

          <DashboardStripeFrame
            href="/day-hui"
            surfaceClass="bg-gradient-to-r from-violet-500 to-violet-600"
            iconRailClass="bg-violet-900/35"
            icon={<IconStripeTimeline />}
          >
            <p className={dashboardStripeTitleClass}>Dây &amp; kỳ gần nhất</p>
            <p className={`${dashboardStripeValueClass} min-w-0`}>{nextKyLabel}</p>
            <p className={dashboardStripeCaptionClass}>{nextKySub}</p>
          </DashboardStripeFrame>

          <DashboardStripeFrame
            surfaceClass="bg-gradient-to-r from-teal-500 to-teal-600"
            iconRailClass="bg-teal-900/35"
            icon={<IconStripeTrendIn />}
          >
            <p className={dashboardStripeTitleClass}>Tổng thu</p>
            <p className={dashboardStripeValueClass}>{formatMoneyVN(totalGross)}</p>
          </DashboardStripeFrame>

          <DashboardStripeFrame
            surfaceClass="bg-gradient-to-r from-red-500 to-red-600"
            iconRailClass="bg-red-900/35"
            icon={<IconStripeTrendOut />}
          >
            <p className={dashboardStripeTitleClass}>Tổng chi</p>
            <p className={dashboardStripeValueClass}>{formatMoneyVN(totalPaidOut)}</p>
          </DashboardStripeFrame>

          <DashboardStripeFrame
            surfaceClass="bg-gradient-to-r from-indigo-500 to-indigo-600"
            iconRailClass="bg-indigo-900/35"
            icon={<IconStripeCoins />}
          >
            <p className={dashboardStripeTitleClass}>Tiền cò</p>
            <p className={dashboardStripeValueClass}>{formatMoneyVN(tienCoLuyKe)}</p>
          </DashboardStripeFrame>
        </section>

        <section className={`mt-3 ${dashCard}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">Danh sách dây hụi</h2>
            <Link
              href="/day-hui"
              className="text-sm font-semibold text-[#2980b9] hover:underline"
            >
              Mở trang dây hụi →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {lines.length === 0 ? (
              <p
                className={`rounded-xl border border-dashed border-neutral-200 px-4 py-8 text-center text-sm ${textMuted}`}
              >
                Chưa có dây hụi.{" "}
                <Link href="/day-hui" className="font-semibold text-[#2980b9] hover:underline">
                  Tạo dây mới
                </Link>
              </p>
            ) : (
              lines.map((line) => {
                const latest = line.openings[0];
                const amount = Number(line.mucHuiThang);
                const legN = line._count.legs;
                const nextOpen = latest
                  ? `${formatDateVN(latest.ngayKhui)} • Kỳ ${latest.kyThu}`
                  : `${formatDateVN(line.ngayMo)} (mở dây)`;
                const st = lineStatusDisplay(line);
                const badgeClass =
                  st.variant === "open"
                    ? "bg-emerald-100 text-[#2d8a57]"
                    : "bg-neutral-100 text-slate-700";
                return (
                  <div
                    key={line.id}
                    className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{line.name}</p>
                      <p className={`text-sm ${textMuted}`}>
                        {legN}/{line.soChan} chân • {formatMoneyVN(amount)}/kỳ • Khui: {nextOpen}
                      </p>
                    </div>
                    <p
                      title={st.variant === "open" ? "Đã có kỳ khui" : "Chưa khui kỳ nào"}
                      className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${badgeClass}`}
                    >
                      {st.label}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
  );
}
