import { NextResponse } from "next/server";

import { requireChuHuiUserForApi } from "@/lib/chu-hui-scope";
import { prisma } from "@/lib/prisma";
import { syncPaidMarksWhenOpeningDelivered } from "@/lib/theo-doi-opening-sync";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ openingId: string }> },
) {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;

    const { openingId } = await params;
    const owned = await prisma.huiOpening.findFirst({
      where: { id: openingId, huiLine: { userId: gate.userId } },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ message: "Không tìm thấy kỳ khui" }, { status: 404 });
    }

    const updated = await prisma.huiOpening.update({
      where: { id: openingId },
      data: { status: "DA_GIAO_TIEN" },
      select: { id: true, status: true },
    });
    await syncPaidMarksWhenOpeningDelivered(openingId);
    return NextResponse.json({ ok: true, opening: updated });
  } catch (error) {
    console.error("PUT /api/thu-tien/[openingId] error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
