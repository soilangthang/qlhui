"use client";

export type ReceiptPdfOptions = {
  /** Mặc định 2; giảm (vd 1.5) trên mobile → file PDF nhẹ hơn khi gửi Zalo. */
  scale?: number;
  /** JPEG 0–1, mặc định 0.88 */
  jpegQuality?: number;
};

/** Trình duyệt có chia sẻ file PDF qua sheet hệ thống (thường là điện thoại). */
export function canSharePdfFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.share || typeof navigator.canShare !== "function") {
    return false;
  }
  try {
    const probe = new File([new Uint8Array([37, 80, 68, 70])], "probe.pdf", { type: "application/pdf" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Điện thoại / iPad: dùng Web Share (Zalo, Facebook trong sheet).
 * Máy tính Windows/Mac/Linux: luôn coi là desktop → chỉ tải PDF, không mở Share của hệ điều hành.
 */
export function isPhoneLikeDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return true;
  if (/iPhone|iPod/i.test(ua)) return true;
  if (/iPad/i.test(ua)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  return false;
}

function downloadPdfBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Chụp DOM phiếu → một trang PDF A4 (co giữ tỉ lệ). */
export async function receiptElementToPdfBlob(
  element: HTMLElement,
  options?: ReceiptPdfOptions,
): Promise<Blob> {
  const scale = options?.scale ?? 2;
  const jpegQuality = options?.jpegQuality ?? 0.88;

  /* html2canvas gốc không parse lab()/oklch() của Tailwind 4 → lỗi khi chụp; pro hỗ trợ. */
  const [{ default: html2canvas }, jspdfMod] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf/dist/jspdf.es.min.js"),
  ]);

  const JsPDF = jspdfMod.default;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
  });

  const pageWidthMm = 210;
  const pageHeightMm = 297;
  const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let imgWidthMm = pageWidthMm;
  let imgHeightMm = (canvas.height / canvas.width) * pageWidthMm;
  let offsetXMm = 0;
  let offsetYMm = 0;

  if (imgHeightMm > pageHeightMm) {
    const ratio = pageHeightMm / imgHeightMm;
    imgWidthMm *= ratio;
    imgHeightMm = pageHeightMm;
    offsetXMm = (pageWidthMm - imgWidthMm) / 2;
  }

  const imgData = canvas.toDataURL("image/jpeg", jpegQuality);
  pdf.addImage(imgData, "JPEG", offsetXMm, offsetYMm, imgWidthMm, imgHeightMm);

  return pdf.output("blob");
}

export type SharePdfResult = "shared" | "downloaded" | "cancelled";

/**
 * Điện thoại (`useWebShare: true`): Web Share với file PDF nếu trình duyệt hỗ trợ, không thì tải xuống.
 * Máy tính (`useWebShare: false`): luôn tải PDF qua thuộc tính download, không mở hộp thoại Share.
 */
export async function sharePdfFile(
  blob: Blob,
  fileName: string,
  title: string,
  options?: { useWebShare?: boolean },
): Promise<SharePdfResult> {
  const useWebShare = options?.useWebShare !== false;

  if (!useWebShare) {
    downloadPdfBlob(blob, fileName);
    return "downloaded";
  }

  const file = new File([blob], fileName, { type: "application/pdf" });
  const shareData: ShareData = { files: [file], title, text: title };

  if (typeof navigator !== "undefined" && navigator.share) {
    const can =
      typeof navigator.canShare === "function" ? navigator.canShare(shareData) : false;
    if (can) {
      try {
        await navigator.share(shareData);
        return "shared";
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
        throw e;
      }
    }
  }

  downloadPdfBlob(blob, fileName);
  return "downloaded";
}

export function safePdfFileBase(name: string) {
  const t = name
    .trim()
    .replace(/[^a-zA-ZÀ-ỹ0-9._-]+/g, "_")
    .replace(/_+/g, "_");
  return t.slice(0, 72) || "hui-vien";
}
