import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireChuHuiUserForApi } from "@/lib/chu-hui-scope";
import { prisma } from "@/lib/prisma";
import {
  getWinnerMemberKeyForOpeningId,
  tryCompleteOpeningWhenAllNonWinnersPaid,
} from "@/lib/theo-doi-opening-sync";

const bodySchema = z.object({
  huiOpeningId: z.string().min(1),
  memberKey: z.string().min(1).max(400),
  paidFull: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
    }
    const { huiOpeningId, memberKey, paidFull } = parsed.data;

    if (!memberKey.startsWith("id:") && !memberKey.startsWith("np:")) {
      return NextResponse.json({ message: "memberKey không hợp lệ" }, { status: 400 });
    }

    const opening = await prisma.huiOpening.findFirst({
      where: { id: huiOpeningId, huiLine: { userId: gate.userId } },
      select: { id: true },
    });
    if (!opening) {
      return NextResponse.json({ message: "Không tìm thấy kỳ khui" }, { status: 404 });
    }

    const winnerKey = await getWinnerMemberKeyForOpeningId(huiOpeningId);
    if (winnerKey != null && memberKey === winnerKey) {
      return NextResponse.json(
        { message: "Người hốt không dùng đánh dấu đóng đủ — trạng thái theo xác nhận giao tiền." },
        { status: 400 },
      );
    }

    await prisma.huiOpeningMemberPaidMark.upsert({
      where: {
        huiOpeningId_memberKey: { huiOpeningId, memberKey },
      },
      create: { huiOpeningId, memberKey, paidFull },
      update: { paidFull },
    });

    const sync = await tryCompleteOpeningWhenAllNonWinnersPaid(huiOpeningId);

    return NextResponse.json({
      ok: true,
      openingAutoCompleted: sync.completed,
      openingStatus: sync.status,
    });
  } catch (error) {
    console.error("POST /api/theo-doi/mark error:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2021") {
        return NextResponse.json(
          {
            message:
              "Database chưa có bảng HuiOpeningMemberPaidMark. Chạy: npx prisma migrate deploy (hoặc migrate dev) trên đúng DATABASE_URL.",
          },
          { status: 503 },
        );
      }
    }

    const msg = error instanceof Error ? error.message : String(error);
    if (
      /Cannot read properties of undefined \(reading 'upsert'\)|huiOpeningMemberPaidMark/i.test(msg)
    ) {
      return NextResponse.json(
        {
          message:
            "Prisma Client chưa có model đánh dấu. Trong thư mục dự án chạy: npx prisma generate — sau đó tắt hẳn và bật lại next dev (hoặc build lại).",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
