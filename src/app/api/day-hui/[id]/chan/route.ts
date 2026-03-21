import { NextResponse } from "next/server";

import { requireChuHuiUserForApi } from "@/lib/chu-hui-scope";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;

    const { id } = await params;

    const line = await prisma.huiLine.findFirst({
      where: { id, userId: gate.userId },
      select: { id: true, soChan: true },
    });
    if (!line) {
      return NextResponse.json({ message: "Dây hụi không tồn tại" }, { status: 404 });
    }

    const existing = await prisma.huiLeg.findMany({
      where: { huiLineId: id },
      orderBy: { stt: "asc" },
      select: {
        id: true,
        stt: true,
        memberName: true,
        memberPhone: true,
        note: true,
      },
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
      select: {
        id: true,
        stt: true,
        memberName: true,
        memberPhone: true,
        note: true,
      },
    });

    return NextResponse.json({ ok: true, legs });
  } catch (error) {
    console.error("GET /api/day-hui/[id]/chan error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
