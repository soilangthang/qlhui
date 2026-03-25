"use client";

import { useEffect, useState } from "react";

type BankQrImageProps = {
  /** Chuỗi mã hóa nội dung QR (ví dụ bank|stk|tên). */
  qrValue: string;
  sizePx: number;
  qrImageDataUrl?: string;
  qrImageUrl?: string;
  className?: string;
  alt?: string;
};

/**
 * Ưu tiên ảnh QR do chủ hụi tải lên / URL; nếu không có thì vẽ QR trong trình duyệt
 * (tránh gọi api.qrserver.com — thường ~1s/request và tải trùng trên phiếu giao + phiếu tạm thu).
 */
export function BankQrImage({
  qrValue,
  sizePx,
  qrImageDataUrl,
  qrImageUrl,
  className,
  alt,
}: BankQrImageProps) {
  const custom = (qrImageDataUrl?.trim() || qrImageUrl?.trim()) || "";
  const [generated, setGenerated] = useState<string | null>(null);

  useEffect(() => {
    if (custom) return;
    let cancelled = false;
    void import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(qrValue, {
          width: sizePx,
          margin: 1,
          color: { dark: "#000000ff", light: "#ffffffff" },
        }),
      )
      .then((url) => {
        if (!cancelled) setGenerated(url);
      })
      .catch(() => {
        if (!cancelled) setGenerated(null);
      });
    return () => {
      cancelled = true;
    };
  }, [custom, qrValue, sizePx]);

  const src = custom || generated;
  if (!src) {
    return (
      <div
        className={className}
        style={{ width: sizePx, height: sizePx }}
        aria-hidden
      />
    );
  }

  const isData = src.startsWith("data:");
  return (
    <img
      src={src}
      alt={alt ?? ""}
      width={sizePx}
      height={sizePx}
      crossOrigin={isData ? undefined : "anonymous"}
      className={className}
    />
  );
}
