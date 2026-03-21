import { NextResponse } from "next/server";
import { z } from "zod";

import { requireChuHuiUserForApi } from "@/lib/chu-hui-scope";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(2, "Họ tên phải từ 2 ký tự"),
  phone: z.string().min(9, "Số điện thoại không hợp lệ"),
  note: z.string().max(500, "Ghi chú quá dài").optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const { name, phone, note } = parsed.data;

    const self = await prisma.huiMember.findFirst({
      where: { id, userId: gate.userId },
      select: { id: true },
    });
    if (!self) {
      return NextResponse.json({ message: "Không tìm thấy hụi viên" }, { status: 404 });
    }

    const existedPhone = await prisma.huiMember.findFirst({
      where: {
        userId: gate.userId,
        phone,
        NOT: { id },
      },
      select: { id: true },
    });
    if (existedPhone) {
      return NextResponse.json({ message: "Số điện thoại đã tồn tại" }, { status: 409 });
    }

    const updated = await prisma.huiMember.update({
      where: { id },
      data: {
        name,
        phone,
        note: note?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        note: true,
      },
    });

    return NextResponse.json({ ok: true, member: updated });
  } catch (error) {
    console.error("PUT /api/hui-vien/[id] error:", error);
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? `Lỗi hệ thống: ${error.message}`
        : "Lỗi hệ thống";
    return NextResponse.json({ message: detail }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const del = await prisma.huiMember.deleteMany({ where: { id, userId: gate.userId } });
    if (del.count === 0) {
      return NextResponse.json({ message: "Không tìm thấy hụi viên" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/hui-vien/[id] error:", error);
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? `Lỗi hệ thống: ${error.message}`
        : "Lỗi hệ thống";
    return NextResponse.json({ message: detail }, { status: 500 });
  }
}
