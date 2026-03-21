import Link from "next/link";

import HuiShell from "@/components/hui-shell";
import { assertChuHuiUserId } from "@/lib/chu-hui-scope";
import { prisma } from "@/lib/prisma";

function formatMoneyVN(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function formatDateVN(value: Date) {
  const d = String(value.getDate()).padStart(2, "0");
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const y = value.getFullYear();
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

export default async function DashboardPage() {
  const userId = await assertChuHuiUserId();

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

  let nextKyLabel = "—";
  let nextKySub = "Chưa có dây hoặc chưa khui kỳ nào";
  if (latestOpeningGlobal) {
    nextKyLabel = formatDateVN(latestOpeningGlobal.ngayKhui);
    nextKySub = `${latestOpeningGlobal.huiLine.name} • Kỳ ${latestOpeningGlobal.kyThu} (mới nhất)`;
  } else if (lineFallback) {
    nextKyLabel = formatDateVN(lineFallback.ngayMo);
    nextKySub = `${lineFallback.name} • Ngày mở dây`;
  }

  return (
    <HuiShell>
      <div className="min-h-[calc(100vh-140px)]">
        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
            <p className="text-xl font-bold tracking-tight text-amber-700">Chờ giao tiền người hốt</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {choGiaoTien.length === 0 ? (
                <span className="text-lg font-semibold text-emerald-600">Không có kỳ chờ</span>
              ) : (
                <>
                  {choGiaoTien.length} <span className="text-xl font-bold text-slate-700">kỳ</span>
                </>
              )}
            </p>
            {choGiaoTien.length > 0 ? (
              <>
                <p className="mt-2 text-sm font-medium text-amber-800">
                  Đã khui nhưng chủ hụi chưa bấm xác nhận đã giao tiền mặt.
                </p>
                <ul className="mt-3 max-h-52 space-y-2 overflow-y-auto text-left text-sm">
                  {choGiaoTien.map((o) => {
                    const phone = o.winnerPhone?.trim();
                    return (
                      <li
                        key={o.id}
                        className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2"
                      >
                        <div className="font-medium text-slate-900">
                          <span className="font-semibold">{o.winnerName || "Chưa rõ"}</span>
                          {phone ? <span className="text-slate-600"> · {phone}</span> : null}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {o.huiLine.name} · Kỳ {o.kyThu} · {formatDateVN(o.ngayKhui)} ·{" "}
                          <span className="font-semibold text-slate-800">
                            {formatMoneyVN(o.finalPayout)}
                          </span>
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-slate-500">
                  Mở <span className="font-medium">dây hụi</span> tương ứng → trang khui → bấm{" "}
                  <span className="font-medium">Xác nhận</span> sau khi đã giao tiền.{" "}
                  <Link href="/thu-tien" className="font-medium text-blue-600 hover:underline">
                    Thu tiền
                  </Link>
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Khi có kỳ ở trạng thái &quot;chờ giao tiền&quot;, danh sách sẽ hiện tại đây.
              </p>
            )}
          </article>
          <article className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Dây &amp; kỳ gần nhất</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{nextKyLabel}</p>
            <p className="mt-2 text-sm font-medium text-amber-600">{nextKySub}</p>
          </article>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-xl font-bold tracking-tight text-emerald-600">Tổng thu</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{formatMoneyVN(totalGross)}</p>
          </article>
          <article className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
            <p className="text-xl font-bold tracking-tight text-rose-600">Tổng chi</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{formatMoneyVN(totalPaidOut)}</p>
          </article>
          <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <p className="text-xl font-bold tracking-tight text-blue-600">Tiền cò</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{formatMoneyVN(tienCoLuyKe)}</p>
          </article>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">Hụi viên trong danh bạ:</span>{" "}
          <span className="text-slate-900">{huiMemberCount}</span> người •{" "}
          <Link href="/hui-vien" className="font-medium text-blue-600 hover:underline">
            Quản lý hụi viên
          </Link>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-slate-900">Danh sách dây hụi</h2>
            <Link
              href="/day-hui"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              Mở trang dây hụi →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {lines.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-slate-500">
                Chưa có dây hụi.{" "}
                <Link href="/day-hui" className="font-semibold text-blue-600 hover:underline">
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
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-700";
                return (
                  <div
                    key={line.id}
                    className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{line.name}</p>
                      <p className="text-sm text-slate-500">
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
    </HuiShell>
  );
}
