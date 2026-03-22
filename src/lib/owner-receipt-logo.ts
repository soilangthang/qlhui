import { prisma } from "@/lib/prisma";

/** Data URL cho ảnh lưu dạng Bytes + mime (QR/logo). */
export function receiptImageBytesToDataUrl(imageData: Uint8Array | Buffer, mimeType: string) {
  return `data:${mimeType};base64,${Buffer.from(imageData).toString("base64")}`;
}

/**
 * Logo lưu trên cột OwnerReceiptSetting (logoImageData / logoMimeType).
 * Cột chưa có (chưa migrate) → trả rỗng, không ném lỗi.
 */
export async function getOwnerReceiptLogoDataUrl(userId: string): Promise<string> {
  try {
    const s = await prisma.ownerReceiptSetting.findUnique({
      where: { userId },
      select: { logoImageData: true, logoMimeType: true },
    });
    if (!s?.logoImageData || !s.logoMimeType) return "";
    return receiptImageBytesToDataUrl(s.logoImageData, s.logoMimeType);
  } catch {
    return "";
  }
}
