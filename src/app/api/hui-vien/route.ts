import { NextResponse } from "next/server";
import { z } from "zod";

import { requireChuHuiUserForApi } from "@/lib/chu-hui-scope";
import { prisma } from "@/lib/prisma";

const huiVienSchema = z.object({
  name: z.string().min(2, "Họ tên phải từ 2 ký tự"),
  phone: z.string().min(9, "Số điện thoại không hợp lệ"),
  note: z.string().max(500, "Ghi chú quá dài").optional(),
});

export async function GET() {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;

    const members = await prisma.huiMember.findMany({
      where: { userId: gate.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        note: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, members });
  } catch (error) {
    console.error("GET /api/hui-vien error:", error);
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? `Lỗi hệ thống: ${error.message}`
        : "Lỗi hệ thống";
    return NextResponse.json({ message: detail }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;

    const body = await request.json();
    const parsed = huiVienSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const { name, phone, note } = parsed.data;

    const existed = await prisma.huiMember.findFirst({
      where: { userId: gate.userId, phone },
      select: { id: true },
    });
    if (existed) {
      return NextResponse.json({ message: "Số điện thoại đã tồn tại" }, { status: 409 });
    }

    const created = await prisma.huiMember.create({
      data: {
        userId: gate.userId,
        name,
        phone,
        note: note?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        note: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, member: created });
  } catch (error) {
    console.error("POST /api/hui-vien error:", error);
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? `Lỗi hệ thống: ${error.message}`
        : "Lỗi hệ thống";
    return NextResponse.json({ message: detail }, { status: 500 });
  }
}
