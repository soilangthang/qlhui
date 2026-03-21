import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminPayloadOrNull } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name: z.string().trim().min(1, "Tên không được để trống").max(120).optional(),
  phone: z.string().trim().min(8, "SĐT không hợp lệ").max(20).optional(),
  rule: z.enum(["user", "admin"]).optional(),
  /** Chỉ áp dụng cho tài khoản chủ hụi. */
  chuHuiAccessUnlocked: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminPayloadOrNull();
    if (!admin) {
      return NextResponse.json({ message: "Không có quyền" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Không tìm thấy tài khoản" }, { status: 404 });
    }

    const { name, phone, rule, chuHuiAccessUnlocked } = parsed.data;
    if (phone && phone !== existing.phone) {
      const taken = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
      if (taken && taken.id !== id) {
        return NextResponse.json({ message: "Số điện thoại đã được dùng cho tài khoản khác" }, { status: 409 });
      }
    }

    if (rule === "user" && existing.rule === "admin") {
      const adminCount = await prisma.user.count({ where: { rule: "admin" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { message: "Không thể bỏ quyền admin của tài khoản admin duy nhất" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name != null ? { name } : {}),
        ...(phone != null ? { phone } : {}),
        ...(rule != null ? { rule } : {}),
        ...(chuHuiAccessUnlocked !== undefined && existing.rule === "user"
          ? { chuHuiAccessUnlocked }
          : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        rule: true,
        chuHuiAccessUnlocked: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    console.error("PATCH /api/admin/users/[id] error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminPayloadOrNull();
    if (!admin) {
      return NextResponse.json({ message: "Không có quyền" }, { status: 403 });
    }

    const { id } = await params;
    if (id === admin.sub) {
      return NextResponse.json({ message: "Không thể xóa tài khoản đang đăng nhập" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Không tìm thấy tài khoản" }, { status: 404 });
    }

    if (existing.rule === "admin") {
      const adminCount = await prisma.user.count({ where: { rule: "admin" } });
      if (adminCount <= 1) {
        return NextResponse.json({ message: "Không thể xóa admin duy nhất" }, { status: 400 });
      }
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/users/[id] error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
