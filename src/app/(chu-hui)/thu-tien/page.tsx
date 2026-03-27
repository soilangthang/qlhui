import ThuTienTable from "@/components/thu-tien-table";
import { assertChuHuiUserId } from "@/lib/chu-hui-scope";
import { logPerf, perfNowMs } from "@/lib/perf-log";
import { prisma } from "@/lib/prisma";

type ThuTienRowPayload = {
  id: string;
  huiLineId: string;
  huiLineName: string;
  kyThu: number;
  ngayKhui: string;
  grossPayout: number;
  status: "CHO_GIAO_TIEN" | "DA_GIAO_TIEN";
};

export default async function ThuTienPage() {
  const t0 = perfNowMs();
  const userId = await assertChuHuiUserId();
  const lineIds = (
    await prisma.huiLine.findMany({
      where: { userId },
      select: { id: true },
    })
  ).map((line) => line.id);

  const openings = lineIds.length
    ? await prisma.huiOpening.findMany({
        where: {
          status: "CHO_GIAO_TIEN",
          huiLineId: { in: lineIds },
        },
        orderBy: [{ ngayKhui: "desc" }],
        take: 300,
        select: {
          id: true,
          kyThu: true,
          ngayKhui: true,
          grossPayout: true,
          status: true,
          huiLine: { select: { id: true, name: true } },
        },
      })
    : [];

  // Fallback hiển thị lịch sử gần đây để tránh trang trắng nếu user chưa có kỳ "chờ".
  const fallbackOpenings = openings.length
    ? []
    : lineIds.length
      ? await prisma.huiOpening.findMany({
          where: {
            status: { in: ["CHO_GIAO_TIEN", "DA_GIAO_TIEN"] },
            huiLineId: { in: lineIds },
          },
          orderBy: [{ ngayKhui: "desc" }],
          take: 100,
          select: {
            id: true,
            kyThu: true,
            ngayKhui: true,
            grossPayout: true,
            status: true,
            huiLine: { select: { id: true, name: true } },
          },
        })
      : [];

  const rowsSource = openings.length > 0 ? openings : fallbackOpenings;
  const rows: ThuTienRowPayload[] = rowsSource.map((item) => ({
    id: item.id,
    huiLineId: item.huiLine.id,
    huiLineName: item.huiLine.name,
    kyThu: item.kyThu,
    ngayKhui: item.ngayKhui.toISOString(),
    grossPayout: item.grossPayout,
    status: item.status,
  }));
  logPerf(
    "thu-tien-page-fresh",
    t0,
    `userId=${userId} lineIds=${lineIds.length} choRows=${openings.length} rows=${rows.length}`,
  );

  return (
    <section className="min-h-[calc(100vh-140px)] rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Thu tiền</h2>
      <p className="mt-1 text-sm text-slate-600">
        {openings.length > 0
          ? "Danh sách kỳ đang chờ giao tiền"
          : "Hiện chưa có kỳ chờ giao tiền — đang hiển thị lịch sử kỳ gần đây"}
      </p>

      <div className="mt-4">
        <ThuTienTable
          initialRows={rows}
        />
      </div>
    </section>
  );
}
