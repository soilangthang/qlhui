import ThuTienTable from "@/components/thu-tien-table";
import { assertChuHuiUserId } from "@/lib/chu-hui-scope";
import { logPerf, perfNowMs } from "@/lib/perf-log";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

type ThuTienRowPayload = {
  id: string;
  huiLineId: string;
  huiLineName: string;
  kyThu: number;
  ngayKhui: string;
  grossPayout: number;
  status: "CHO_GIAO_TIEN" | "DA_GIAO_TIEN";
};

const loadThuTienRowsCached = unstable_cache(
  async (userId: string): Promise<ThuTienRowPayload[]> => {
    const t0 = perfNowMs();
    const openings = await prisma.huiOpening.findMany({
      where: {
        status: { in: ["CHO_GIAO_TIEN", "DA_GIAO_TIEN"] },
        huiLine: { userId },
      },
      orderBy: [{ ngayKhui: "desc" }],
      select: {
        id: true,
        kyThu: true,
        ngayKhui: true,
        grossPayout: true,
        status: true,
        huiLine: { select: { id: true, name: true } },
      },
    });

    const rows = openings.map((item) => ({
      id: item.id,
      huiLineId: item.huiLine.id,
      huiLineName: item.huiLine.name,
      kyThu: item.kyThu,
      // Trả về string để ổn định khi unstable_cache serialize.
      ngayKhui: item.ngayKhui.toISOString(),
      grossPayout: item.grossPayout,
      status: item.status,
    }));

    logPerf("loadThuTienRowsCached", t0, `userId=${userId} rows=${rows.length}`);
    return rows;
  },
  ["thu-tien-page-v1"],
  { revalidate: 60, tags: ["thu-tien-panel-data"] },
);

export default async function ThuTienPage() {
  const userId = await assertChuHuiUserId();

  const openings = await loadThuTienRowsCached(userId);

  return (
    <section className="min-h-[calc(100vh-140px)] rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Thu tiền</h2>
      <p className="mt-1 text-sm text-slate-600">Danh sách kỳ đang chờ giao tiền</p>

      <div className="mt-4">
        <ThuTienTable
          initialRows={openings}
        />
      </div>
    </section>
  );
}
