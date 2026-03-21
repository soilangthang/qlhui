import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const { name, phone, password } = parsed.data;
    const existed = await prisma.user.findUnique({ where: { phone } });
    if (existed) {
      return NextResponse.json(
        { message: "Số điện thoại đã tồn tại" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name,
        phone,
        passwordHash,
        rule: "user",
      },
    });

    return NextResponse.json({ ok: true, message: "Đăng ký thành công" });
  } catch {
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
