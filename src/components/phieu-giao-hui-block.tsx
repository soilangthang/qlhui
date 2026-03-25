"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BankQrImage } from "@/components/bank-qr-image";
import { hoiTienDaTruCoTheoNhieuChan } from "@/lib/hui-member-line-metrics";
import {
  chuKyLabelVi,
  computePhieuGiaoBreakdown,
  kyConLaiSauHoot,
  truChanSongVND,
} from "@/lib/phieu-giao-hui";
import { formatViCalendarDate, formatViDateTime } from "@/lib/receipt-datetime";
import {
  canSharePdfFiles,
  isPhoneLikeDevice,
  receiptElementToPdfBlob,
  safePdfFileBase,
  sharePdfFile,
} from "@/lib/receipt-pdf";

export type PhieuGiaoSlipPayload = {
  lineName: string;
  lineAmount: number;
  /** Tiền cò chủ (mỗi kỳ), VNĐ — dùng để hiển thị trừ cò trên phiếu; khớp lúc khui. */
  tienCoLine: number;
  ngayMoIso: string;
  chuKy: "NGAY" | "THANG" | "NAM";
  totalCycles: number;
  kyThu: number;
  ngayKhuiIso: string;
  bidAmount: number;
  grossPayout: number;
  finalPayout: number;
  winnerName: string;
  winnerPhone: string | null;
  openingNote: string | null;
  winnerSlots: number;
  contributors: number;
  contributionPerSlot: number;
  /** Tổng số chân của người hốt trên dây — có thì trừ ngang như phiếu tạm tính. */
  memberSlots?: number | null;
};

type ReceiptSetting = {
  huiName: string;
  ownerName: string;
  address: string;
  phone: string;
  bankAccount: string;
  bankName: string;
  accountName: string;
  qrImageUrl?: string;
  qrImageDataUrl?: string;
  /** Logo chủ hụi; không có thì dùng /app-logo.png */
  logoImageDataUrl?: string;
};

function formatMoneyVN(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

const PhieuGiaoHuiBlock = forwardRef<
  HTMLDivElement,
  {
    payload: PhieuGiaoSlipPayload;
    receiptSetting: ReceiptSetting;
  }
>(function PhieuGiaoHuiBlock({ payload, receiptSetting }, ref) {
  const breakdown = useMemo(
    () =>
      computePhieuGiaoBreakdown({
        totalSlots: payload.totalCycles,
        winnerSlots: payload.winnerSlots,
        lineAmount: payload.lineAmount,
        bidAmount: payload.bidAmount,
        contributionPerSlot: payload.contributionPerSlot,
        grossPayout: payload.grossPayout,
      }),
    [payload],
  );

  /** Trừ tiền đầu thảo (cò): theo mức dây; fallback gross−final nếu không có dữ liệu cũ. */
  const tienCoTru = Math.max(0, Math.round(payload.tienCoLine));
  const commission =
    tienCoTru > 0 ? tienCoTru : Math.max(0, payload.grossPayout - payload.finalPayout);

  const memberSlotsKnown =
    payload.memberSlots != null && payload.memberSlots > 0 ? Math.trunc(payload.memberSlots) : null;

  /** Tiền hốt thực nhận khi trừ ngang nhiều chân (giống phiếu tạm tính). */
  const payoffTheoNhieuChan =
    memberSlotsKnown != null
      ? hoiTienDaTruCoTheoNhieuChan(
          payload.totalCycles,
          memberSlotsKnown,
          payload.contributionPerSlot,
          commission,
        )
      : null;

  const truChanSong =
    memberSlotsKnown != null
      ? truChanSongVND(memberSlotsKnown, payload.winnerSlots, payload.contributionPerSlot)
      : 0;

  const chanSongTruCount =
    memberSlotsKnown != null ? Math.max(0, memberSlotsKnown - payload.winnerSlots) : 0;

  /** Số tiền cần giao: ưu tiên công thức nhiều chân nếu biết N; không thì như cũ. */
  const soTienCanGiao =
    payoffTheoNhieuChan != null ? payoffTheoNhieuChan : tienCoTru > 0
      ? Math.max(0, payload.grossPayout - tienCoTru)
      : payload.finalPayout;
  const kyConLai = kyConLaiSauHoot(payload.totalCycles, payload.kyThu);
  /** Thời điểm “ngày giao” / ký: cập nhật theo thời gian thực, trước khi in và định kỳ. */
  const [slipNow, setSlipNow] = useState(() => new Date());
  useEffect(() => {
    const bump = () => setSlipNow(new Date());
    const onBeforePrint = bump;
    const onPdfCapture = bump;
    const id = window.setInterval(bump, 60_000);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("phieu-giao-refresh-time", onPdfCapture);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("phieu-giao-refresh-time", onPdfCapture);
    };
  }, []);

  const ownerPhone = receiptSetting.phone?.trim() || "—";
  const ownerAddress = receiptSetting.address?.trim() || "—";
  const bankLine =
    [receiptSetting.bankAccount?.trim(), receiptSetting.bankName?.trim()].filter(Boolean).join(" - ") || "—";
  const chuTk = (receiptSetting.accountName || receiptSetting.ownerName || "—").trim();

  const qrValue = `${receiptSetting.bankName || "BANK"}|${receiptSetting.bankAccount || ""}|${chuTk}`;
  const logoSrc = receiptSetting.logoImageDataUrl?.trim() || "/app-logo.png";

  return (
    <div
      ref={ref}
      id="phieu-giao-hoi-print"
      className="mx-auto w-full max-w-[720px] overflow-hidden rounded-xl border-2 border-amber-400/80 bg-white text-slate-900 shadow-md print:max-w-none print:rounded-none print:border-0 print:shadow-none"
    >
      <div className="grid gap-3 border-b border-slate-300 p-4 md:grid-cols-[1fr_1fr] print:gap-2 print:p-3">
        <div className="flex gap-3">
          <img
            src={logoSrc}
            alt=""
            width={48}
            height={48}
            crossOrigin={logoSrc.startsWith("data:") ? undefined : "anonymous"}
            className="h-12 w-12 shrink-0 rounded-full object-cover print:h-10 print:w-10"
          />
          <div className="min-w-0 text-sm leading-snug">
            <p className="text-base font-bold text-slate-900 print:text-sm">{receiptSetting.huiName}</p>
            <p className="text-slate-700">{ownerAddress}</p>
            <p className="font-semibold text-slate-800">{ownerPhone}</p>
          </div>
        </div>
        <div className="text-sm leading-snug md:text-right">
          <p className="font-semibold text-slate-800">Thông tin tài khoản:</p>
          <p className="text-slate-800">{bankLine}</p>
          <p className="font-medium text-slate-700">{chuTk}</p>
        </div>
      </div>

      <div className="border-b border-slate-300 bg-amber-50/90 px-4 py-3 text-center print:py-2">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 print:text-xl">PHIẾU GIAO HỤI</h2>
        <p className="mt-1 text-lg font-bold text-amber-900 print:text-base">
          {payload.lineName} — Kỳ {payload.kyThu}
        </p>
      </div>

      <div className="border-b-2 border-amber-400 bg-yellow-100 px-4 py-2 print:py-1.5">
        <p className="text-center text-lg font-bold text-slate-900 print:text-base">
          Hụi viên: <span className="uppercase">{payload.winnerName}</span>
          {payload.winnerPhone ? (
            <span className="ml-2 text-base font-semibold text-slate-700">— {payload.winnerPhone}</span>
          ) : null}
        </p>
      </div>

      <div className="grid gap-px border-b border-slate-300 bg-slate-300 text-sm md:grid-cols-2 print:text-xs">
        <div className="flex justify-between gap-2 bg-white px-3 py-2">
          <span className="font-semibold text-slate-600">Ngày mở hụi</span>
          <span className="text-right font-medium tabular-nums">{formatViCalendarDate(payload.ngayMoIso)}</span>
        </div>
        <div className="flex justify-between gap-2 bg-white px-3 py-2">
          <span className="font-semibold text-slate-600">Số tiền</span>
          <span className="font-bold tabular-nums">{formatMoneyVN(payload.lineAmount)}</span>
        </div>
        <div className="flex justify-between gap-2 bg-white px-3 py-2">
          <span className="font-semibold text-slate-600">Số kỳ hụi</span>
          <span className="font-medium">{payload.totalCycles}</span>
        </div>
        <div className="flex justify-between gap-2 bg-white px-3 py-2">
          <span className="font-semibold text-slate-600">Khui</span>
          <span className="font-medium">{chuKyLabelVi(payload.chuKy)}</span>
        </div>
        <div className="flex justify-between gap-2 bg-white px-3 py-2">
          <span className="font-semibold text-slate-600">Ngày hốt</span>
          <span className="text-right font-medium tabular-nums">{formatViCalendarDate(payload.ngayKhuiIso)}</span>
        </div>
        <div className="flex justify-between gap-2 bg-white px-3 py-2">
          <span className="font-semibold text-slate-600">Kỳ hốt số</span>
          <span className="font-bold">{payload.kyThu}</span>
        </div>
        <div className="flex justify-between gap-2 bg-white px-3 py-2">
          <span className="font-semibold text-slate-600">Thăm kêu</span>
          <span className="font-bold tabular-nums">{formatMoneyVN(payload.bidAmount)}</span>
        </div>
        <div className="flex justify-between gap-2 bg-amber-50 px-3 py-2">
          <span className="font-semibold text-rose-800">Ngày giao</span>
          <span className="font-extrabold text-rose-700 tabular-nums">{formatViDateTime(slipNow)}</span>
        </div>
      </div>

      <div className="border-b border-slate-300 bg-white px-4 py-2 print:py-1.5">
        <p className="text-sm font-semibold text-slate-700">Ghi chú:</p>
        <p className="min-h-[1.5rem] text-sm text-slate-800">{payload.openingNote?.trim() || "—"}</p>
      </div>

      <div className="border-b-2 border-amber-500 bg-yellow-50 p-4 print:p-3">
        <table className="w-full border-collapse text-sm print:text-xs">
          <tbody className="divide-y divide-amber-200/80">
            <tr>
              <td className="py-2 pr-2 font-semibold text-slate-800">Số chân chết</td>
              <td className="py-2 text-right font-bold tabular-nums">
                {breakdown.deadCount} × {formatMoneyVN(payload.lineAmount)} = {formatMoneyVN(breakdown.deadTotal)}
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-2 font-semibold text-slate-800">Số chân sống</td>
              <td className="py-2 text-right font-bold tabular-nums">
                {breakdown.liveCount} × {formatMoneyVN(payload.contributionPerSlot)} ={" "}
                {formatMoneyVN(breakdown.liveTotal)}
              </td>
            </tr>
            <tr className="border-t-2 border-amber-400">
              <td className="py-2 pr-2 font-extrabold text-slate-900">Tổng số tiền hụi</td>
              <td className="py-2 text-right text-lg font-extrabold tabular-nums text-slate-900 print:text-base">
                {formatMoneyVN(payload.grossPayout)}
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-2 font-semibold text-slate-800">Trừ tiền đầu thảo (cò)</td>
              <td className="py-2 text-right font-bold text-rose-700 tabular-nums">
                − {formatMoneyVN(commission)}
              </td>
            </tr>
            {memberSlotsKnown != null ? (
              <tr>
                <td className="py-2 pr-2 font-semibold text-slate-800">Trừ chân sống</td>
                <td className="py-2 text-right font-bold tabular-nums">
                  <span className="text-rose-700">− {formatMoneyVN(truChanSong)}</span>
                  <span className="mt-0.5 block text-sm font-semibold text-slate-800 print:text-xs">
                    {chanSongTruCount} × {formatMoneyVN(payload.contributionPerSlot)} = {formatMoneyVN(truChanSong)}
                  </span>
                </td>
              </tr>
            ) : null}
            <tr className="border-t-2 border-amber-600 bg-amber-100/80">
              <td className="py-2 pr-2 font-extrabold text-slate-900">Số tiền cần giao</td>
              <td className="py-2 text-right text-xl font-extrabold tabular-nums text-emerald-800 print:text-lg">
                {formatMoneyVN(soTienCanGiao)}
              </td>
            </tr>
          </tbody>
        </table>
        {kyConLai > 0 ? (
          <p className="mt-3 text-center text-sm font-semibold text-amber-900 print:text-xs">
            (Cần đóng thêm {kyConLai} kỳ là mãn hụi.)
          </p>
        ) : (
          <p className="mt-3 text-center text-sm font-semibold text-amber-900 print:text-xs">(Đã đủ kỳ trên dây.)</p>
        )}
      </div>

      <div className="space-y-3 border-b border-slate-300 bg-white p-4 text-sm leading-relaxed text-rose-800 print:p-3 print:text-[10px] print:leading-snug">
        <p>
          Tôi xác nhận tỉnh táo, đã nhận đủ số tiền ghi trên phiếu và cam kết tiếp tục đóng đủ các kỳ còn lại theo
          quy định dây hụi cho đến khi mãn hụi.
        </p>
        <p className="font-semibold text-slate-800">
          Đã nhận đủ tiền hụi bằng tin nhắn Zalo thay chữ ký khi hai bên thống nhất.
        </p>
        <p className="font-bold text-slate-900">Tôi đồng ý với bảng âm — dương do chủ hụi lập.</p>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] print:grid-cols-[1fr_100px] print:p-3">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="text-center">
            <p className="text-sm font-bold text-slate-800 print:text-xs">Người nhận tiền (ký, họ tên)</p>
            <div className="mt-12 border-t border-slate-400 pt-1 print:mt-8">
              <p className="font-bold uppercase">{payload.winnerName}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600 print:text-[10px]">{formatViDateTime(slipNow)}</p>
            <p className="mt-2 text-sm font-bold text-slate-800 print:text-xs">Người giao tiền (ký, họ tên)</p>
            <div className="mt-8 border-t border-slate-400 pt-1 print:mt-6">
              <p className="font-bold">{receiptSetting.ownerName || "Chủ hụi"}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-start border-t border-slate-200 pt-4 md:border-t-0 md:border-l md:pl-4 md:pt-0 print:pt-0">
          <p className="text-xs font-semibold text-slate-600 print:text-[8px]">QR thanh toán</p>
          <BankQrImage
            qrValue={qrValue}
            sizePx={160}
            qrImageDataUrl={receiptSetting.qrImageDataUrl}
            qrImageUrl={receiptSetting.qrImageUrl}
            className="mt-1 h-24 w-24 rounded border border-slate-200 bg-white p-1 object-contain print:h-20 print:w-20"
            alt=""
          />
        </div>
      </div>
    </div>
  );
});

export default function PhieuGiaoHuiSection({
  payload,
  receiptSetting,
  onRegisterPrintRoot,
}: {
  payload: PhieuGiaoSlipPayload;
  receiptSetting: ReceiptSetting;
  /** Gọi với ref nội bộ để trang cha ẩn phiếu kia lúc in. */
  onRegisterPrintRoot?: (el: HTMLDivElement | null) => void;
}) {
  const printRef = useCallback(
    (node: HTMLDivElement | null) => {
      onRegisterPrintRoot?.(node);
    },
    [onRegisterPrintRoot],
  );

  const [, setPdfCapturing] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const innerRef = useRef<HTMLDivElement | null>(null);

  const phoneLike = useMemo(() => isPhoneLikeDevice(), []);

  useEffect(() => {
    setCanShareFiles(canSharePdfFiles());
  }, []);

  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node;
      printRef(node);
    },
    [printRef],
  );

  const handlePdf = useCallback(async () => {
    const el = innerRef.current;
    if (!el) return;
    window.dispatchEvent(new Event("phieu-giao-refresh-time"));
    setShareHint(null);
    setShareBusy(true);
    setPdfCapturing(true);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    try {
      const onPhone = isPhoneLikeDevice();
      const blob = await receiptElementToPdfBlob(el, onPhone ? { scale: 1.5, jpegQuality: 0.88 } : undefined);
      const base = safePdfFileBase(payload.winnerName);
      const fileName = `Phieu-giao-hoi-${base}-ky${payload.kyThu}.pdf`;
      const result = await sharePdfFile(blob, fileName, "Phiếu giao hụi", { useWebShare: onPhone });
      if (result === "downloaded") {
        setShareHint(
          onPhone
            ? "Đã tải PDF. Mở Zalo và đính kèm file."
            : "Đã tải PDF về máy (thư mục Tải xuống).",
        );
      } else if (result === "shared") {
        setShareHint("Đã mở chia sẻ — chọn Zalo hoặc ứng dụng khác.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lỗi tạo PDF";
      setShareHint(`Không tạo được PDF: ${msg}`);
    } finally {
      setPdfCapturing(false);
      setShareBusy(false);
    }
  }, [payload.kyThu, payload.winnerName]);

  return (
    <div className="mb-8 space-y-3 print:mb-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Phiếu giao hụi</h2>
          <p className="text-sm text-slate-600">
            Phiếu xác nhận giao tiền cho người hốt kỳ {payload.kyThu} — in hoặc gửi PDF qua Zalo.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={shareBusy}
            onClick={() => void handlePdf()}
            className="rounded-xl border border-amber-700 bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
          >
            {shareBusy ? "Đang tạo PDF…" : phoneLike && canShareFiles ? "Chia sẻ PDF phiếu giao" : "Tải PDF phiếu giao"}
          </button>
        </div>
      </div>
      {shareHint ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 print:hidden">
          {shareHint}
        </p>
      ) : null}
      <PhieuGiaoHuiBlock ref={mergedRef} payload={payload} receiptSetting={receiptSetting} />
    </div>
  );
}
