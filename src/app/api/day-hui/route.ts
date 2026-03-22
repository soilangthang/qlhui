import { HuiCycle, HuiLineStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireChuHuiUserForApi } from "@/lib/chu-hui-scope";
import { prisma } from "@/lib/prisma";

const dayHuiSchema = z.object({
  name: z.string().min(2, "Tên dây hụi phải từ 2 ký tự"),
  soChan: z.number().int().min(1, "Số chân phải lớn hơn 0"),
  mucHuiThang: z.string().min(1, "Vui lòng nhập mức hụi/tháng"),
  tienCo: z.string().min(1, "Vui lòng nhập tiền cò (có thể nhập 0 nếu không lấy cò)"),
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

function toSerializableLine(line: {
  id: string;
  name: string;
  soChan: number;
  mucHuiThang: { toString: () => string } | string;
  tienCo: { toString: () => string } | string | null;
  ngayMo: Date;
  chuKy: HuiCycle;
  status: HuiLineStatus;
  openings?: Array<{ id: string }>;
  _count?: { openings: number };
}) {
  return {
    id: line.id,
    name: line.name,
    soChan: line.soChan,
    mucHuiThang:
      typeof line.mucHuiThang === "string" ? line.mucHuiThang : line.mucHuiThang.toString(),
    tienCo:
      line.tienCo == null ? null : typeof line.tienCo === "string" ? line.tienCo : line.tienCo.toString(),
    chuKy: line.chuKy,
    ngayMo: line.ngayMo.toISOString(),
    status: line.status,
    hasOpened: Boolean(line.openings?.length),
    openingCount: line._count?.openings ?? 0,
  };
}

export async function GET() {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;

    const lines = await prisma.huiLine.findMany({
      where: { userId: gate.userId },
      orderBy: { createdAt: "asc" },
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
          take: 1,
          select: { id: true },
        },
        _count: {
          select: { openings: true },
        },
      },
    });

    return NextResponse.json({ ok: true, lines: lines.map(toSerializableLine) });
  } catch (error) {
    console.error("GET /api/day-hui error:", error);
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
    const parsed = dayHuiSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const { name, soChan, mucHuiThang, tienCo, chuKy, ngayMo } = parsed.data;

    const mucHuiDecimal = parseMoneyToDecimal(mucHuiThang);
    if (!mucHuiDecimal || Number(mucHuiDecimal) <= 0) {
      return NextResponse.json({ message: "Mức hụi/tháng không hợp lệ" }, { status: 400 });
    }

    const tienCoDecimal = parseMoneyToDecimal(tienCo);
    if (!tienCoDecimal) {
      return NextResponse.json({ message: "Tiền cò không hợp lệ" }, { status: 400 });
    }
    if (Number(tienCoDecimal) < 0) {
      return NextResponse.json({ message: "Tiền cò không được âm" }, { status: 400 });
    }

    const ngayMoDate = parseDisplayDate(ngayMo);
    if (!ngayMoDate) {
      return NextResponse.json({ message: "Ngày mở không hợp lệ" }, { status: 400 });
    }

    const created = await prisma.huiLine.create({
      data: {
        userId: gate.userId,
        name,
        soChan,
        mucHuiThang: mucHuiDecimal,
        tienCo: tienCoDecimal,
        chuKy,
        ngayMo: ngayMoDate,
        status: HuiLineStatus.CHO_GOP,
      },
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
          take: 1,
          select: { id: true },
        },
        _count: {
          select: { openings: true },
        },
      },
    });

    return NextResponse.json({ ok: true, line: toSerializableLine(created) });
  } catch (error) {
    console.error("POST /api/day-hui error:", error);
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? `Lỗi hệ thống: ${error.message}`
        : "Lỗi hệ thống";
    return NextResponse.json({ message: detail }, { status: 500 });
  }
}
