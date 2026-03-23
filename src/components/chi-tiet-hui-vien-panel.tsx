"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  formatDateShortYY,
  formatMoneyVN,
  nextHootDateIso,
  profitToneClass,
  computeMemberRealizedProfit,
  rowsForMember,
  type HuiLineDetailRow,
  type HuiMemberRef,
} from "@/lib/hui-member-line-metrics";
import {
  canSharePdfFiles,
  isPhoneLikeDevice,
  receiptElementToPdfBlob,
  safePdfFileBase,
  sharePdfFile,
} from "@/lib/receipt-pdf";

function printScaleForLineCount(lineCount: number): number {
  const n = Math.max(1, lineCount);
  let scale = 17.952 / (17.4 + n);
  if (n >= 16) scale *= 0.92;
  if (n >= 20) scale *= 0.94;
  return Math.min(0.9, Math.max(0.28, scale));
}

/** Bảng ~10 cột + số tiền dài: cần scale nhỏ hơn phiếu tạm thu để vừa A4 dọc (~190mm khả dụng). */
function printScaleHuiVienBaoCao(lineCount: number): number {
  const byRows = printScaleForLineCount(lineCount);
  return Math.min(byRows, 0.66);
}

function formatBaoCaoDateTime(d = new Date()) {
  return `Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()} - ${d.getHours()} giờ ${d.getMinutes()} phút`;
}

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
  /** Logo tròn giống phiếu tạm tính (Cài đặt / DB). */
  logoImageDataUrl?: string;
};

export default function ChiTietHuiVienPanel({
  members,
  rows,
  defaultMemberId,
  receiptSetting,
}: {
  members: HuiMemberRef[];
  rows: HuiLineDetailRow[];
  defaultMemberId: string;
  receiptSetting: ReceiptSetting;
}) {
  const [memberId, setMemberId] = useState(defaultMemberId || members[0]?.id || "");
  const selectedMember = useMemo(
    () => members.find((item) => item.id === memberId) ?? null,
    [members, memberId],
  );

  const displayRows = useMemo(() => rowsForMember(rows, selectedMember), [rows, selectedMember]);

  const totals = useMemo(() => {
    let chan = 0;
    let chet = 0;
    let song = 0;
    /** Cùng quy ước báo cáo: Dương = đóng − hốt; `realizedProfit` nội bộ = hốt − đóng. */
    let amDuong = 0;
    for (const row of displayRows) {
      if (!selectedMember) continue;
      const { deadSlots, liveSlots, realizedProfit: rProfit } =
        computeMemberRealizedProfit(row, selectedMember);
      chan += row.memberSlots;
      chet += deadSlots;
      song += liveSlots;
      amDuong -= rProfit;
    }
    return { chan, chet, song, amDuong };
  }, [displayRows, selectedMember]);

  const printRootRef = useRef<HTMLDivElement>(null);
  const [pdfCapturing, setPdfCapturing] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [phoneLike, setPhoneLike] = useState(false);

  useEffect(() => {
    setPhoneLike(isPhoneLikeDevice());
    setCanShareFiles(canSharePdfFiles());
  }, []);

  const ownerPhone = receiptSetting.phone?.trim() || "Chưa cập nhật";
  const ownerAddress = receiptSetting.address?.trim() || "Chưa cập nhật";
  const ownerBankAccount = receiptSetting.bankAccount?.trim() || "Chưa cập nhật";
  const ownerBankName = receiptSetting.bankName?.trim() || "";
  const ownerDisplayName = (receiptSetting.accountName || receiptSetting.ownerName || "Chủ hụi").trim();

  const handleSharePdf = useCallback(async () => {
    const el = printRootRef.current;
    if (!el) return;
    setShareHint(null);
    setShareBusy(true);
    setPdfCapturing(true);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    try {
      const onPhone = typeof window !== "undefined" && isPhoneLikeDevice();
      const blob = await receiptElementToPdfBlob(
        el,
        onPhone ? { scale: 1.5, jpegQuality: 0.8 } : undefined,
      );
      const base = safePdfFileBase(selectedMember?.name ?? "hoi-vien");
      const fileName = `Thong-tin-hoi-vien-${base}.pdf`;
      const result = await sharePdfFile(blob, fileName, "Thông tin hụi viên", {
        useWebShare: onPhone,
      });
      if (result === "downloaded") {
        setShareHint(
          onPhone
            ? "Trình duyệt đã tải PDF. Mở Zalo hoặc Facebook và đính kèm file vừa tải."
            : "Đã tải file PDF về máy (thường là thư mục Tải xuống).",
        );
      } else if (result === "shared") {
        setShareHint("Đã mở chia sẻ — chọn Zalo, Facebook hoặc ứng dụng khác.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Không tạo được PDF";
      const taint = /taint|security error|canvas/i.test(msg);
      const colorCss = /lab\(|oklch|lch\(|unsupported color|color function/i.test(msg);
      if (taint) {
        setShareHint(
          "Không đọc được ảnh QR khi tạo PDF. Trong Cài đặt, hãy tải ảnh QR lên (không chỉ dùng link ngoài) rồi thử lại.",
        );
      } else if (colorCss) {
        setShareHint(
          `Lỗi màu CSS khi chụp: ${msg}. Hãy cập nhật trang hoặc dùng Chrome/Edge bản mới; có thể dùng nút In → Lưu PDF.`,
        );
      } else {
        setShareHint(`Không tạo được PDF: ${msg}`);
      }
    } finally {
      setPdfCapturing(false);
      setShareBusy(false);
    }
  }, [selectedMember?.name]);

  useEffect(() => {
    const el = printRootRef.current;
    if (!el) return;

    const applyPrintScale = () => {
      const scale = printScaleHuiVienBaoCao(displayRows.length);
      const isFirefox =
        typeof navigator !== "undefined" && /firefox\//i.test(navigator.userAgent);

      el.style.removeProperty("zoom");
      el.style.removeProperty("transform");
      el.style.removeProperty("transform-origin");
      el.style.removeProperty("width");

      if (isFirefox) {
        el.style.transform = `scale(${scale})`;
        el.style.transformOrigin = "top left";
        el.style.width = `${(100 / scale).toFixed(4)}%`;
      } else {
        el.style.zoom = String(scale);
      }
    };

    const clearPrintScale = () => {
      el.style.removeProperty("zoom");
      el.style.removeProperty("transform");
      el.style.removeProperty("transform-origin");
      el.style.removeProperty("width");
    };

    const onBeforePrint = () => applyPrintScale();
    const onAfterPrint = () => clearPrintScale();

    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);

    const mql = window.matchMedia("print");
    const onPrintMql = () => {
      if (mql.matches) applyPrintScale();
      else clearPrintScale();
    };
    mql.addEventListener("change", onPrintMql);

    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      mql.removeEventListener("change", onPrintMql);
      clearPrintScale();
    };
  }, [displayRows.length]);

  return (
    <section className="min-h-[calc(100vh-140px)] rounded-2xl border border-slate-300 bg-white p-4 shadow-sm print:min-h-0 print:h-auto print:border-0 print:p-0 print:shadow-none">
      <div className="mb-4 flex flex-col gap-3 print:hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm text-slate-600">
            {!phoneLike ? (
              <>
                <span className="font-semibold text-slate-800">Máy tính:</span> bấm nút xanh để{" "}
                <span className="font-semibold">tải PDF</span> báo cáo hụi viên.
              </>
            ) : canShareFiles ? (
              <>
                <span className="font-semibold text-slate-800">Điện thoại:</span> bấm nút xanh để chia sẻ PDF qua Zalo /
                Facebook.
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-800">Điện thoại:</span> nút xanh sẽ{" "}
                <span className="font-semibold">tải PDF</span>.
              </>
            )}
          </p>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              disabled={shareBusy}
              onClick={() => void handleSharePdf()}
              className="w-full rounded-xl border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {shareBusy
                ? "Đang tạo PDF…"
                : !phoneLike
                  ? "Tải PDF về máy"
                  : canShareFiles
                    ? "Chia sẻ PDF (Zalo / Facebook)"
                    : "Tải PDF"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full rounded-xl border border-slate-300 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto"
            >
              In báo cáo
            </button>
          </div>
        </div>
        {shareHint ? (
          <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">{shareHint}</p>
        ) : null}
      </div>

      <div
        ref={printRootRef}
        id="hui-vien-chi-tiet-print"
        className="mx-auto w-full max-w-[1200px] overflow-hidden rounded-xl border border-slate-300 bg-white print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:shadow-none print:leading-tight"
      >
        <div className="grid gap-3 border-b border-slate-300 p-4 md:grid-cols-2 print:gap-1 print:p-2">
          <div className="flex gap-3 text-sm font-medium text-slate-800">
            <img
              src={receiptSetting.logoImageDataUrl?.trim() || "/app-logo.png"}
              alt=""
              width={56}
              height={56}
              crossOrigin={
                (receiptSetting.logoImageDataUrl?.trim() || "").startsWith("data:") ? undefined : "anonymous"
              }
              className="h-14 w-14 shrink-0 rounded-full object-cover print:h-12 print:w-12"
            />
            <div className="min-w-0">
              <p className="text-lg font-bold print:text-base">{receiptSetting.huiName}</p>
              <div className="mt-1 grid grid-cols-[90px_1fr] items-start gap-x-2 gap-y-0.5 text-[17px] leading-7 print:grid-cols-[72px_1fr] print:text-xs print:leading-snug">
                <span className="font-semibold">Địa chỉ:</span>
                <span>{ownerAddress}</span>
                <span className="font-semibold">Điện thoại:</span>
                <span>{ownerPhone}</span>
                <span className="font-semibold">STK:</span>
                <span>
                  {ownerBankAccount}
                  {ownerBankName ? ` - ${ownerBankName}` : ""}
                </span>
                <span className="font-semibold">Chủ TK:</span>
                <span>{ownerDisplayName}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center text-center text-slate-900">
            <p className="text-2xl font-bold tracking-wide print:text-lg">THÔNG TIN HỤI VIÊN</p>
            <p className="mt-2 text-xl font-bold uppercase print:text-base">
              {selectedMember?.name ?? "—"}
            </p>
            <p className="mt-1 text-sm text-slate-600 print:text-[10px]">{formatBaoCaoDateTime()}</p>
          </div>
        </div>

        <div
          className={`grid gap-3 border-b border-slate-300 bg-slate-50 p-4 md:grid-cols-3 md:items-end print:hidden ${pdfCapturing ? "hidden" : ""}`}
        >
          <label className="grid gap-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Chọn hụi viên</span>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
            >
              {members.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {item.phone}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            Điện thoại: {selectedMember?.phone ?? "—"}
          </div>
        </div>

        <div
          className={`border-b border-slate-300 bg-slate-50 p-3 print:block ${pdfCapturing ? "block" : "hidden"}`}
        >
          <p className="text-xs font-semibold text-slate-600 print:text-[9px]">Hụi viên (in)</p>
          <p className="text-sm font-bold text-slate-900 print:text-[10px]">
            {selectedMember ? `${selectedMember.name} — ${selectedMember.phone}` : "—"}
          </p>
        </div>

        <div className="overflow-x-auto border-b border-slate-300 print:overflow-visible print:[&_th]:px-0.5 print:[&_th]:py-0.5 print:[&_td]:px-0.5 print:[&_td]:py-0.5 print:[&_tbody]:text-[7px] print:[&_thead]:text-[7px]">
          <table className="min-w-[980px] w-full max-w-full table-fixed border-collapse text-sm print:min-w-0 print:w-full print:max-w-full print:text-[8px]">
            <thead className="bg-amber-100 text-slate-800">
              <tr className="border-b border-slate-300">
                <th className="w-10 border-r border-slate-300 px-1 py-2 text-center">STT</th>
                <th className="border-r border-slate-300 px-2 py-2 text-center">Dây hụi</th>
                <th className="w-24 border-r border-slate-300 px-1 py-2 text-center">Số tiền</th>
                <th className="w-24 border-r border-slate-300 px-1 py-2 text-center">Ngày</th>
                <th className="w-24 border-r border-slate-300 px-1 py-2 text-center">Số kỳ đóng</th>
                <th className="w-28 border-r border-slate-300 px-1 py-2 text-center">Kỳ hiện tại</th>
                <th className="w-14 border-r border-slate-300 px-1 py-2 text-center">Số chân</th>
                <th className="w-14 border-r border-slate-300 px-1 py-2 text-center">Chân chết</th>
                <th className="w-14 border-r border-slate-300 px-1 py-2 text-center">Chân sống</th>
                <th className="w-28 border-r border-slate-300 px-1 py-2 text-center">Âm / Dương</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-center text-[13px] font-medium text-slate-800 print:text-[8px]">
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-slate-500">
                    Chưa chọn hụi viên hoặc hụi viên chưa tham gia dây nào.
                  </td>
                </tr>
              ) : (
                displayRows.map((row, idx) => {
                  const m = selectedMember!;
                  const nextIso = nextHootDateIso(row);
                  const {
                    deadSlots,
                    liveSlots,
                    realizedProfit: rProfit,
                    kyDaDong,
                  } = computeMemberRealizedProfit(row, m);
                  const amDuong = -rProfit;
                  return (
                    <tr key={row.lineId}>
                      <td className="border-r border-slate-300 px-1 py-2">{idx + 1}</td>
                      <td className="border-r border-slate-300 px-2 py-2 text-left text-xs font-bold uppercase leading-snug print:text-[7px]">
                        {row.lineName}
                      </td>
                      <td className="border-r border-slate-300 px-1 py-2 tabular-nums">{formatMoneyVN(row.lineAmount)}</td>
                      <td className="border-r border-slate-300 px-1 py-2 tabular-nums">
                        {formatDateShortYY(row.ngayMo)}
                      </td>
                      <td className="border-r border-slate-300 px-1 py-2 tabular-nums">
                        {`${kyDaDong}/${row.totalCycles}`}
                      </td>
                      <td className="border-r border-slate-300 px-1 py-2">
                        <div className="font-semibold tabular-nums">{row.latestKy ?? "—"}</div>
                        {nextIso ? (
                          <div className="mt-0.5 text-[10px] font-medium leading-tight text-rose-600 print:text-[6px] print:leading-snug">
                            <span className="block">Ngày hốt dự kiến</span>
                            <span className="block tabular-nums">{formatDateShortYY(nextIso)}</span>
                          </div>
                        ) : (
                          <div className="mt-0.5 text-[10px] text-slate-500 print:text-[6px]">—</div>
                        )}
                      </td>
                      <td className="border-r border-slate-300 px-1 py-2 tabular-nums">{row.memberSlots}</td>
                      <td className="border-r border-slate-300 px-1 py-2 text-sm font-semibold text-rose-600 tabular-nums print:text-[8px]">
                        {deadSlots}
                      </td>
                      <td className="border-r border-slate-300 px-1 py-2 text-sm font-semibold text-blue-600 tabular-nums print:text-[8px]">
                        {liveSlots}
                      </td>
                      <td
                        className={`border-r border-slate-300 px-1 py-2 text-sm font-semibold tabular-nums print:text-[8px] ${profitToneClass(
                          amDuong,
                        )}`}
                      >
                        {formatMoneyVN(amDuong)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {displayRows.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-slate-400 bg-amber-50 font-bold">
                  <td colSpan={6} className="px-2 py-2 text-right text-slate-900 print:py-1 print:text-[8px]">
                    TỔNG CỘNG
                  </td>
                  <td className="border-l border-slate-300 px-1 py-2 text-center tabular-nums print:py-1 print:text-[8px]">
                    {totals.chan}
                  </td>
                  <td className="border-l border-slate-300 px-1 py-2 text-center text-rose-700 tabular-nums print:py-1 print:text-[8px]">
                    {totals.chet}
                  </td>
                  <td className="border-l border-slate-300 px-1 py-2 text-center text-blue-700 tabular-nums print:py-1 print:text-[8px]">
                    {totals.song}
                  </td>
                  <td
                    className={`border-l border-slate-300 px-1 py-2 text-center text-sm tabular-nums print:py-1 print:text-[8px] ${profitToneClass(
                      totals.amDuong,
                    )}`}
                  >
                    {formatMoneyVN(totals.amDuong)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
    </section>
  );
}
