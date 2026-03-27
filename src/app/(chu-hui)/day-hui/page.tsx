import { unstable_cache } from "next/cache";

import DayHuiPanel from "@/components/day-hui-panel";
import { assertChuHuiUserId } from "@/lib/chu-hui-scope";
import { prisma } from "@/lib/prisma";

function formatDateDisplay(date: Date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

const loadDayHuiPageDataCached = unstable_cache(
  async (userId: string) => {
    return prisma.huiLine.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        kind: true,
        gopCycleDays: true,
        fixedBid: true,
        soChan: true,
        mucHuiThang: true,
        tienCo: true,
        chuKy: true,
        ngayMo: true,
        status: true,
        _count: {
          select: { openings: true },
        },
      },
    });
  },
  ["day-hui-page-data-v1"],
  { revalidate: 120, tags: ["day-hui-page-data"] },
);

export default async function DayHuiPage() {
  const userId = await assertChuHuiUserId();
  const lines = await loadDayHuiPageDataCached(userId);

  return (
    <section>
      <DayHuiPanel
        initialLines={lines.map((line) => ({
          id: line.id,
          name: line.name,
          kind: line.kind,
          gopCycleDays: line.gopCycleDays ?? null,
          fixedBid: line.fixedBid ?? null,
          soChan: line.soChan,
          mucHuiThang: line.mucHuiThang.toString(),
          tienCo: line.tienCo?.toString() ?? null,
          chuKy: line.chuKy,
          ngayMo: formatDateDisplay(new Date(line.ngayMo)),
          status: line.status,
          hasOpened: (line._count?.openings ?? 0) > 0,
          openingCount: line._count?.openings ?? 0,
        }))}
      />
    </section>
  );
}
