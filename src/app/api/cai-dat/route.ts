import { NextResponse } from "next/server";
import { z } from "zod";

import { requireChuHuiUserForApi } from "@/lib/chu-hui-scope";
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

function toQrDataUrl(imageData: Uint8Array, mimeType: string) {
  return `data:${mimeType};base64,${Buffer.from(imageData).toString("base64")}`;
}

export async function GET() {
  try {
    const gate = await requireChuHuiUserForApi();
    if (!gate.ok) return gate.response;
    const uid = gate.userId;

    const setting =
      (await prisma.ownerReceiptSetting.findUnique({
        where: { userId: uid },
        include: {
          qrUpload: {
            select: {
              imageData: true,
              mimeType: true,
            },
          },
        },
      })) ??
      (await prisma.ownerReceiptSetting.create({
        data: {
          userId: uid,
        },
        include: {
          qrUpload: {
            select: {
              imageData: true,
              mimeType: true,
            },
          },
        },
      }));

    const settingResponse = {
      ...setting,
      qrImageDataUrl: setting.qrUpload ? toQrDataUrl(setting.qrUpload.imageData, setting.qrUpload.mimeType) : "",
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
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Vui lòng chọn file ảnh QR" }, { status: 400 });
    }
    if (!ACCEPTED_QR_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ message: "Chỉ hỗ trợ PNG/JPG/WEBP/GIF" }, { status: 400 });
    }
    if (file.size > MAX_QR_UPLOAD_BYTES) {
      return NextResponse.json({ message: "Ảnh QR tối đa 2MB" }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    await prisma.ownerReceiptSetting.upsert({
      where: { userId: uid },
      update: {},
      create: { userId: uid },
    });

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

    return NextResponse.json({
      ok: true,
      qrImageDataUrl: toQrDataUrl(bytes, file.type),
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

    return NextResponse.json({ ok: true, setting: saved });
  } catch (error) {
    console.error("PUT /api/cai-dat error:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
