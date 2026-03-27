import { HuiLineStatus } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { calculateHuiPayout } from "@/lib/calculate-hui-payout";
import { assertKhuiDateIsToday } from "@/lib/local-calendar";
import { requireChuHuiUserForApi } from "@/lib/chu-hui-scope";
import { clearDayHuiLinesCache } from "@/lib/day-hui-cache";
import { prisma } from "@/lib/prisma";

const khuiSchema = z.object({
  ngayKhui: z.string().min(8, "Ngày khui không hợp lệ"),
  note: z.string().trim().optional(),
  winnerLegId: z.string().min(1, "Vui lòng chọn người hốt"),
  bidAmount: z.number().int().min(0).optional(),
});

function parseDisplayDate(value: string) {
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseMoneyInteger(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction && Number(fraction) !== 0) return null;
  const parsed = Number(whole);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const body = await request.json();
    const parsed = khuiSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const khuiDate = parseDisplayDate(parsed.data.ngayKhui);
    if (!khuiDate) {
      return NextResponse.json({ message: "Ngày khui không hợp lệ" }, { status: 400 });
    }

    const ngayKhuiError = assertKhuiDateIsToday(khuiDate);
    if (ngayKhuiError) {
      return NextResponse.json({ message: ngayKhuiError }, { status: 400 });
    }

    const line = await prisma.huiLine.findFirst({
      where: { id, userId: gate.userId },
      select: {
        id: true,
        soChan: true,
        mucHuiThang: true,
        tienCo: true,
        kind: true,
        gopCycleDays: true,
        fixedBid: true,
      },
    });
    if (!line) {
      return NextResponse.json({ message: "Dây hụi không tồn tại" }, { status: 404 });
    }

    const winnerLeg = await prisma.huiLeg.findFirst({
      where: { id: parsed.data.winnerLegId, huiLineId: id },
      select: { stt: true, memberName: true, memberPhone: true, note: true },
    });
    if (!winnerLeg) {
      return NextResponse.json({ message: "Người hốt không hợp lệ" }, { status: 400 });
    }

    const huiAmount = parseMoneyInteger(line.mucHuiThang.toString());
    const commission = parseMoneyInteger(line.tienCo?.toString() ?? "0");
    if (huiAmount == null || commission == null) {
      return NextResponse.json({ message: "Dữ liệu tiền không hợp lệ" }, { status: 400 });
    }

    // Mỗi lần khui chỉ hốt đúng 1 chân (STT đã chọn). Các chân khác của cùng hụi viên vẫn sống.
    const winnerSlots = 1;

    const cycleDays = line.kind === "GOP" ? Math.max(1, line.gopCycleDays ?? 1) : 1;
    const rawBid = line.kind === "GOP" ? (line.fixedBid ?? 0) : (parsed.data.bidAmount ?? 0);
    const safeBidAmount = Math.max(0, Math.trunc(rawBid));
    if (line.kind === "GOP" && safeBidAmount >= huiAmount) {
      return NextResponse.json(
        { message: "Giá thăm cố định phải nhỏ hơn mức dây hụi góp." },
        { status: 400 },
      );
    }

    const payout = calculateHuiPayout({
      totalSlots: line.soChan,
      winnerSlots,
      huiAmount,
      bidAmount: safeBidAmount,
      commission,
      cycleDays,
    });

    const openingCount = await prisma.huiOpening.count({ where: { huiLineId: id } });
    const kyThu = openingCount + 1;

    const [createdOpening] = await prisma.$transaction([
      prisma.huiOpening.create({
        data: {
          huiLineId: id,
          kyThu,
          ngayKhui: khuiDate,
          winnerLegStt: winnerLeg.stt,
          winnerName: winnerLeg.memberName || `Chân ${winnerLeg.stt}`,
          winnerPhone: winnerLeg.memberPhone || null,
          winnerSlots,
          bidAmount: safeBidAmount,
          contributors: payout.contributors,
          contributionPerSlot: payout.contributionPerSlot,
          grossPayout: payout.grossPayout,
          finalPayout: payout.finalPayout,
          status: "CHO_GIAO_TIEN",
          note:
            parsed.data.note?.trim() ||
            `Người hốt: ${winnerLeg.memberName || `Chân ${winnerLeg.stt}`}${
              winnerLeg.memberPhone ? ` (${winnerLeg.memberPhone})` : ""
            }`,
        },
        select: { id: true, kyThu: true },
      }),
      prisma.huiLine.update({
        where: { id },
        data: { status: HuiLineStatus.SAP_MO },
      }),
    ]);

    clearDayHuiLinesCache(gate.userId);
    revalidateTag("day-hui-page-data", "max");
    revalidateTag("thu-tien-panel-data", "max");
    revalidateTag("theo-doi-data", "max");
    revalidateTag("dashboard-data", "max");
    return NextResponse.json({
      ok: true,
      kyThu: createdOpening.kyThu,
      openingId: createdOpening.id,
      status: HuiLineStatus.SAP_MO,
      payout,
    });
  } catch (error) {
    console.error("POST /api/day-hui/[id]/khui error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
