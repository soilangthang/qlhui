import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import { requireChuHuiUserForApi } from "@/lib/chu-hui-scope";
import { receiptImageBytesToDataUrl } from "@/lib/owner-receipt-logo";
import { prisma } from "@/lib/prisma";

const settingSchema = z.object({
  huiName: z.string().trim().min(1, "Vui lòng nhập tên hụi"),
  ownerName: z.string().trim().min(1, "Vui lòng nhập tên chủ hụi"),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  bankAccount: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  accountName: z.string().trim().optional(),
  qrImageUrl: z.string().trim().optional(),
  phieuGhiChu: z.string().max(12000, "Ghi chú phiếu tối đa 12000 ký tự").optional(),
});

const ACCEPTED_QR_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_QR_UPLOAD_BYTES = 2 * 1024 * 1024;

export async function GET() {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;
    const uid = gate.userId;

    const qrInclude = {
      qrUpload: {
        select: {
          imageData: true,
          mimeType: true,
        },
      },
    } as const;

    let setting =
      (await prisma.ownerReceiptSetting.findUnique({
        where: { userId: uid },
        include: qrInclude,
      })) ?? null;

    if (!setting) {
      setting = await prisma.ownerReceiptSetting.create({
        data: {
          userId: uid,
        },
        include: qrInclude,
      });
    }

    const logoImageDataUrl =
      setting.logoImageData && setting.logoMimeType
        ? receiptImageBytesToDataUrl(setting.logoImageData, setting.logoMimeType)
        : "";

    const settingResponse = {
      ...setting,
      qrImageDataUrl: setting.qrUpload
        ? receiptImageBytesToDataUrl(setting.qrUpload.imageData, setting.qrUpload.mimeType)
        : "",
      logoImageDataUrl,
    };

    return NextResponse.json({ ok: true, setting: settingResponse });
  } catch (error) {
    console.error("GET /api/cai-dat error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;
    const uid = gate.userId;

    const formData = await request.formData();
    const file = formData.get("file");
    const kindRaw = formData.get("kind");
    const kind = kindRaw === "logo" ? "logo" : "qr";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: kind === "logo" ? "Vui lòng chọn file logo" : "Vui lòng chọn file ảnh QR" },
        { status: 400 },
      );
    }
    if (!ACCEPTED_QR_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ message: "Chỉ hỗ trợ PNG/JPG/WEBP/GIF" }, { status: 400 });
    }
    if (file.size > MAX_QR_UPLOAD_BYTES) {
      return NextResponse.json({ message: "Ảnh tối đa 2MB" }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    await prisma.ownerReceiptSetting.upsert({
      where: { userId: uid },
      update: {},
      create: { userId: uid },
    });

    if (kind === "logo") {
      try {
        await prisma.ownerReceiptSetting.update({
          where: { userId: uid },
          data: {
            logoImageData: Buffer.from(bytes),
            logoMimeType: file.type,
            logoFileName: file.name,
          },
        });
      } catch {
        return NextResponse.json(
          {
            message:
              "Chưa cập nhật database (cột logo). Chạy: npx prisma migrate deploy hoặc npx prisma db push",
          },
          { status: 503 },
        );
      }

      revalidateTag("thu-tien-panel-data", "max");
      return NextResponse.json({
        ok: true,
        logoImageDataUrl: receiptImageBytesToDataUrl(bytes, file.type),
      });
    }

    await prisma.ownerReceiptQrUpload.upsert({
      where: { settingId: uid },
      update: {
        imageData: bytes,
        mimeType: file.type,
        fileName: file.name,
      },
      create: {
        settingId: uid,
        imageData: bytes,
        mimeType: file.type,
        fileName: file.name,
      },
    });

    revalidateTag("thu-tien-panel-data", "max");
    return NextResponse.json({
      ok: true,
      qrImageDataUrl: receiptImageBytesToDataUrl(bytes, file.type),
    });
  } catch (error) {
    console.error("POST /api/cai-dat error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;
    const uid = gate.userId;

    const body = await request.json();
    const parsed = settingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const saved = await prisma.ownerReceiptSetting.upsert({
      where: { userId: uid },
      update: {
        huiName: parsed.data.huiName,
        ownerName: parsed.data.ownerName,
        address: parsed.data.address ?? "",
        phone: parsed.data.phone ?? "",
        bankAccount: parsed.data.bankAccount ?? "",
        bankName: parsed.data.bankName ?? "",
        accountName: parsed.data.accountName ?? "",
        qrImageUrl: parsed.data.qrImageUrl ?? "",
        phieuGhiChu: parsed.data.phieuGhiChu ?? "",
      },
      create: {
        userId: uid,
        huiName: parsed.data.huiName,
        ownerName: parsed.data.ownerName,
        address: parsed.data.address ?? "",
        phone: parsed.data.phone ?? "",
        bankAccount: parsed.data.bankAccount ?? "",
        bankName: parsed.data.bankName ?? "",
        accountName: parsed.data.accountName ?? "",
        qrImageUrl: parsed.data.qrImageUrl ?? "",
        phieuGhiChu: parsed.data.phieuGhiChu ?? "",
      },
    });

    revalidateTag("thu-tien-panel-data", "max");
    return NextResponse.json({ ok: true, setting: saved });
  } catch (error) {
    console.error("PUT /api/cai-dat error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}

/** Xóa logo phiếu (dùng lại logo mặc định trên phiếu). */
export async function DELETE() {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;
    const uid = gate.userId;

    try {
      await prisma.ownerReceiptSetting.updateMany({
        where: { userId: uid },
        data: {
          logoImageData: null,
          logoMimeType: null,
          logoFileName: null,
        },
      });
    } catch {
      // Cột chưa có: bỏ qua
    }

    revalidateTag("thu-tien-panel-data", "max");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/cai-dat error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
