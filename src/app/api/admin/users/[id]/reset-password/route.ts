import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminPayloadOrNull } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(128),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminPayloadOrNull();
    if (!admin) {
      return NextResponse.json({ message: "Không có quyền" }, { status: 403 });
    }

    const { id } = await params;
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ message: "Không tìm thấy tài khoản" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/admin/users/[id]/reset-password error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
