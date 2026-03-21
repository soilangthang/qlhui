import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, signAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const { phone, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      return NextResponse.json(
        { message: "Số điện thoại hoặc mật khẩu không đúng" },
        { status: 401 },
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { message: "Số điện thoại hoặc mật khẩu không đúng" },
        { status: 401 },
      );
    }

    const token = signAuthToken({ sub: user.id, rule: user.rule });
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      ok: true,
      message: "Đăng nhập thành công",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        rule: user.rule,
        date: user.date,
      },
    });
  } catch {
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
