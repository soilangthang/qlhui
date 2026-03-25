"use client";

import { useEffect, useMemo, useState } from "react";

type WithImageFields = {
  logoImageDataUrl?: string;
  qrImageDataUrl?: string;
};

type ReceiptImgPayload = { logoImageDataUrl: string; qrImageDataUrl: string };

/** Một request cho toàn app (Strict Mode / nhiều panel không gọi trùng). */
let receiptImagesPromise: Promise<ReceiptImgPayload | null> | null = null;

function loadReceiptImagesShared(): Promise<ReceiptImgPayload | null> {
  if (!receiptImagesPromise) {
    receiptImagesPromise = (async () => {
      try {
        const res = await fetch("/api/cai-dat/receipt-images");
        const data = (await res.json()) as {
          ok?: boolean;
          logoImageDataUrl?: string;
          qrImageDataUrl?: string;
        };
        if (!res.ok || !data.ok) return null;
        return {
          logoImageDataUrl: data.logoImageDataUrl ?? "",
          qrImageDataUrl: data.qrImageDataUrl ?? "",
        };
      } catch {
        return null;
      }
    })();
  }
  return receiptImagesPromise;
}

function scheduleIdle(fn: () => void) {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(() => fn(), { timeout: 2500 });
  } else {
    setTimeout(fn, 1);
  }
}

/**
 * Gộp cài đặt phiếu từ RSC (không ảnh base64) với ảnh tải sau qua API — giảm kích thước payload ban đầu.
 * Ảnh được tải sau idle để không tranh băng thông với RSC/tab khác; dùng chung một Promise cho mọi hook.
 */
export function useDeferredReceiptImages<T extends WithImageFields>(receiptSetting: T): T {
  const [extra, setExtra] = useState({ logoImageDataUrl: "", qrImageDataUrl: "" });

  useEffect(() => {
    let cancelled = false;
    scheduleIdle(() => {
      void loadReceiptImagesShared().then((payload) => {
        if (cancelled || !payload) return;
        setExtra(payload);
      });
    });
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
