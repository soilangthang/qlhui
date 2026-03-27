import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import { requireChuHuiUserForApi } from "@/lib/chu-hui-scope";
import { clearDayHuiLinesCache } from "@/lib/day-hui-cache";
import { prisma } from "@/lib/prisma";

const updateLegSchema = z.object({
  memberName: z.string().trim().optional(),
  memberPhone: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; legId: string }> },
) {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;

    const { id, legId } = await params;
    const owned = await prisma.huiLine.findFirst({
      where: { id, userId: gate.userId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ message: "Dây hụi không tồn tại" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateLegSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const updated = await prisma.huiLeg.updateMany({
      where: { id: legId, huiLineId: id },
      data: {
        memberName: parsed.data.memberName || null,
        memberPhone: parsed.data.memberPhone || null,
        note: parsed.data.note || null,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ message: "Không tìm thấy chân hụi" }, { status: 404 });
    }

    clearDayHuiLinesCache(gate.userId);
    revalidateTag("day-hui-page-data", "max");
    revalidateTag("thu-tien-panel-data", "max");
    revalidateTag("theo-doi-data", "max");
    revalidateTag("dashboard-data", "max");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/day-hui/[id]/chan/[legId] error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; legId: string }> },
) {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;

    const { id, legId } = await params;

    const owned = await prisma.huiLine.findFirst({
      where: { id, userId: gate.userId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ message: "Dây hụi không tồn tại" }, { status: 404 });
    }

    const updated = await prisma.huiLeg.updateMany({
      where: { id: legId, huiLineId: id },
      data: {
        memberName: null,
        memberPhone: null,
        note: null,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ message: "Không tìm thấy chân hụi" }, { status: 404 });
    }

    clearDayHuiLinesCache(gate.userId);
    revalidateTag("day-hui-page-data", "max");
    revalidateTag("thu-tien-panel-data", "max");
    revalidateTag("theo-doi-data", "max");
    revalidateTag("dashboard-data", "max");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/day-hui/[id]/chan/[legId] error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
