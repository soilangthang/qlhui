import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import { requireChuHuiUserForApi } from "@/lib/chu-hui-scope";
import { clearDayHuiLinesCache } from "@/lib/day-hui-cache";
import { prisma } from "@/lib/prisma";

const assignSchema = z.object({
  memberId: z.string().min(1, "Thiếu hụi viên"),
  slotCount: z.number().int().min(1, "Số chân phải lớn hơn 0"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const body = await request.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const line = await prisma.huiLine.findFirst({
      where: { id, userId: gate.userId },
      select: { id: true, soChan: true },
    });
    if (!line) {
      return NextResponse.json({ message: "Dây hụi không tồn tại" }, { status: 404 });
    }

    const member = await prisma.huiMember.findFirst({
      where: { id: parsed.data.memberId, userId: gate.userId },
      select: { id: true, name: true, phone: true },
    });
    if (!member) {
      return NextResponse.json({ message: "Hụi viên không tồn tại" }, { status: 404 });
    }

    const existing = await prisma.huiLeg.findMany({
      where: { huiLineId: id },
      orderBy: { stt: "asc" },
      select: { id: true, stt: true, memberName: true },
    });

    const byStt = new Map(existing.map((l) => [l.stt, l]));
    const missing: number[] = [];
    for (let i = 1; i <= line.soChan; i += 1) {
      if (!byStt.has(i)) missing.push(i);
    }
    if (missing.length > 0) {
      await prisma.huiLeg.createMany({
        data: missing.map((stt) => ({ huiLineId: id, stt })),
      });
    }

    const legs = await prisma.huiLeg.findMany({
      where: { huiLineId: id },
      orderBy: { stt: "asc" },
      select: { id: true, memberName: true },
    });
    const emptyLegs = legs.filter((l) => !l.memberName);

    if (emptyLegs.length < parsed.data.slotCount) {
      return NextResponse.json(
        { message: `Không đủ chân trống. Còn ${emptyLegs.length} chân.` },
        { status: 400 },
      );
    }

    const selected = emptyLegs.slice(0, parsed.data.slotCount);
    await prisma.$transaction(
      selected.map((leg) =>
        prisma.huiLeg.update({
          where: { id: leg.id },
          data: {
            memberName: member.name,
            memberPhone: member.phone,
            note: `memberId:${member.id}`,
          },
        }),
      ),
    );

    clearDayHuiLinesCache(gate.userId);
    revalidateTag("thu-tien-panel-data", "max");
    revalidateTag("theo-doi-data", "max");
    revalidateTag("dashboard-data", "max");
    return NextResponse.json({ ok: true, assigned: selected.length });
  } catch (error) {
    console.error("POST /api/day-hui/[id]/chan/assign error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
