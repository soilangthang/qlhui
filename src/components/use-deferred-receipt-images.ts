"use client";

import { useEffect, useMemo, useState } from "react";

type WithImageFields = {
  logoImageDataUrl?: string;
  qrImageDataUrl?: string;
};

/**
 * Gộp cài đặt phiếu từ RSC (không ảnh base64) với ảnh tải sau qua API — giảm kích thước payload ban đầu.
 */
export function useDeferredReceiptImages<T extends WithImageFields>(receiptSetting: T): T {
  const [extra, setExtra] = useState({ logoImageDataUrl: "", qrImageDataUrl: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cai-dat/receipt-images");
        const data = (await res.json()) as {
          ok?: boolean;
          logoImageDataUrl?: string;
          qrImageDataUrl?: string;
        };
        if (!res.ok || cancelled || !data.ok) return;
        setExtra({
          logoImageDataUrl: data.logoImageDataUrl ?? "",
          qrImageDataUrl: data.qrImageDataUrl ?? "",
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () =>
      ({
        ...receiptSetting,
        logoImageDataUrl: extra.logoImageDataUrl || receiptSetting.logoImageDataUrl || "",
        qrImageDataUrl: extra.qrImageDataUrl || receiptSetting.qrImageDataUrl || "",
      }) as T,
    [receiptSetting, extra.logoImageDataUrl, extra.qrImageDataUrl],
  );
}
