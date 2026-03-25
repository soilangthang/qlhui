import { NextResponse } from "next/server";

import { requireChuHuiUserForApi } from "@/lib/chu-hui-scope";
import { receiptImageBytesToDataUrl } from "@/lib/owner-receipt-logo";
import { prisma } from "@/lib/prisma";

/** Trả về QR + logo dạng data URL — tách khỏi RSC để giảm payload tab chi tiết / phiếu thu. */
export async function GET() {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;

    const setting = await prisma.ownerReceiptSetting.findUnique({
      where: { userId: gate.userId },
      select: {
        logoImageData: true,
        logoMimeType: true,
        qrUpload: { select: { imageData: true, mimeType: true } },
      },
    });

    const logoImageDataUrl =
      setting?.logoImageData && setting.logoMimeType
        ? receiptImageBytesToDataUrl(setting.logoImageData, setting.logoMimeType)
        : "";

    const qrImageDataUrl =
      setting?.qrUpload != null
        ? receiptImageBytesToDataUrl(setting.qrUpload.imageData, setting.qrUpload.mimeType)
        : "";

    return NextResponse.json(
      { ok: true, logoImageDataUrl, qrImageDataUrl },
      {
        headers: {
          // Trình duyệt tái sử dụng response (cùng phiên) — giảm tải khi đổi tab qua lại.
          "Cache-Control": "private, max-age=600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("GET /api/cai-dat/receipt-images error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
