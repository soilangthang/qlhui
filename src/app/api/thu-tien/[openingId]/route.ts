import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { requireChuHuiUserForApi } from "@/lib/chu-hui-scope";
import { logPerf, perfNowMs } from "@/lib/perf-log";
import { prisma } from "@/lib/prisma";
import { syncPaidMarksWhenOpeningDelivered } from "@/lib/theo-doi-opening-sync";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ openingId: string }> },
) {
  const t0 = perfNowMs();
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;

    const { openingId } = await params;
    const owned = await prisma.huiOpening.findFirst({
      where: { id: openingId, huiLine: { userId: gate.userId } },
      select: { id: true, status: true, huiLine: { select: { kind: true } } },
    });
    if (!owned) {
      return NextResponse.json({ message: "Không tìm thấy kỳ khui" }, { status: 404 });
    }

    let updated = { id: openingId, status: owned.status };
    if (owned.huiLine.kind === "GOP") {
      await syncPaidMarksWhenOpeningDelivered(openingId);
    } else {
      updated = await prisma.huiOpening.update({
        where: { id: openingId },
        data: { status: "DA_GIAO_TIEN" },
        select: { id: true, status: true },
      });
      await syncPaidMarksWhenOpeningDelivered(openingId);
    }
    revalidateTag("thu-tien-panel-data", "max");
    revalidateTag("theo-doi-data", "max");
    revalidateTag("dashboard-data", "max");
    logPerf("api:thu-tien:confirm", t0, `openingId=${openingId}`);
    return NextResponse.json({ ok: true, opening: updated });
  } catch (error) {
    console.error("PUT /api/thu-tien/[openingId] error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
