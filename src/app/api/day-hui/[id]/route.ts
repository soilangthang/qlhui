import { HuiCycle } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireChuHuiUserForApi } from "@/lib/chu-hui-scope";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(2, "Tên dây hụi phải từ 2 ký tự"),
  soChan: z.number().int().min(1, "Số chân phải lớn hơn 0"),
  mucHuiThang: z.string().min(1, "Vui lòng nhập mức hụi/tháng"),
  tienCo: z.string().optional(),
  chuKy: z.enum(["NGAY", "THANG", "NAM"]).default("THANG"),
  ngayMo: z.string().min(8, "Ngày mở không hợp lệ"),
});

function parseMoneyToDecimal(input: string) {
  const normalized = input.replace(/[^\d.-]/g, "");
  if (!normalized) return null;
  const numeric = Number(normalized);
  if (Number.isNaN(numeric)) return null;
  return numeric.toFixed(2);
}

function parseDisplayDate(value: string) {
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

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
      select: {
        id: true,
        name: true,
        soChan: true,
        mucHuiThang: true,
        tienCo: true,
        chuKy: true,
        ngayMo: true,
        status: true,
        openings: {
          orderBy: { kyThu: "desc" },
          take: 1,
          select: {
            id: true,
            kyThu: true,
            ngayKhui: true,
            winnerName: true,
            finalPayout: true,
            status: true,
          },
        },
        legs: {
          orderBy: { stt: "asc" },
          select: {
            id: true,
            stt: true,
            memberName: true,
            memberPhone: true,
            note: true,
          },
        },
      },
    });
    if (!line) {
      return NextResponse.json({ message: "Dây hụi không tồn tại" }, { status: 404 });
    }
    const latestOpening = line.openings[0] ?? null;
    return NextResponse.json({
      ok: true,
      line: {
        ...line,
        openings: undefined,
        legs: undefined,
        mucHuiThang: line.mucHuiThang.toString(),
        tienCo: line.tienCo?.toString() ?? null,
        ngayMo: line.ngayMo.toISOString(),
      },
      legs: line.legs,
      latestOpening: latestOpening
        ? {
            ...latestOpening,
            ngayKhui: latestOpening.ngayKhui.toISOString(),
          }
        : null,
    });
  } catch (error) {
    console.error("GET /api/day-hui/[id] error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const owned = await prisma.huiLine.findFirst({
      where: { id, userId: gate.userId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ message: "Dây hụi không tồn tại" }, { status: 404 });
    }

    const existingOpening = await prisma.huiOpening.findFirst({
      where: { huiLineId: id },
      select: { id: true },
    });
    if (existingOpening) {
      return NextResponse.json(
        { message: "Dây hụi đã khui, không thể chỉnh sửa." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const { name, soChan, mucHuiThang, tienCo, chuKy, ngayMo } = parsed.data;
    const mucHuiDecimal = parseMoneyToDecimal(mucHuiThang);
    if (!mucHuiDecimal) {
      return NextResponse.json({ message: "Mức hụi không hợp lệ" }, { status: 400 });
    }
    const tienCoDecimal = tienCo?.trim() ? parseMoneyToDecimal(tienCo) : null;
    if (tienCo?.trim() && !tienCoDecimal) {
      return NextResponse.json({ message: "Tiền cò không hợp lệ" }, { status: 400 });
    }
    const ngayMoDate = parseDisplayDate(ngayMo);
    if (!ngayMoDate) {
      return NextResponse.json({ message: "Ngày mở không hợp lệ" }, { status: 400 });
    }

    await prisma.huiLine.update({
      where: { id },
      data: {
        name,
        soChan,
        mucHuiThang: mucHuiDecimal,
        tienCo: tienCoDecimal,
        chuKy: chuKy as HuiCycle,
        ngayMo: ngayMoDate,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/day-hui/[id] error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
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
    const owned = await prisma.huiLine.findFirst({
      where: { id, userId: gate.userId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ message: "Dây hụi không tồn tại" }, { status: 404 });
    }

    const existingOpening = await prisma.huiOpening.findFirst({
      where: { huiLineId: id },
      select: { id: true },
    });
    if (existingOpening) {
      return NextResponse.json({ message: "Dây hụi đã khui, không thể xóa." }, { status: 400 });
    }
    await prisma.huiLine.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/day-hui/[id] error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
