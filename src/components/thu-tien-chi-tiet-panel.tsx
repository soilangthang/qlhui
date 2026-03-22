"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  deadSlotsOnRowForMember,
  formatDateDisplay,
  formatMoneyVN,
  futureDeadLegPayEstimate,
  hoiTienDaTruCoTheoNhieuChan,
  isMemberWinnerOnRow,
  khuiTrungKyGroupKey,
  profitToneClass,
  rowsForMember,
  type HuiLineDetailRow,
  type HuiMemberRef,
} from "@/lib/hui-member-line-metrics";
import { formatViDateTime } from "@/lib/receipt-datetime";
import { filterRowsForPhieuTamThu } from "@/lib/local-calendar";
import { slipNoteLinesFromSetting } from "@/lib/phieu-ghi-chu-default";
import {
  canSharePdfFiles,
  isPhoneLikeDevice,
  receiptElementToPdfBlob,
  safePdfFileBase,
  sharePdfFile,
} from "@/lib/receipt-pdf";
import PhieuGiaoHuiSection, { type PhieuGiaoSlipPayload } from "@/components/phieu-giao-hui-block";

/**
 * Thu phóng khi in để gom phiếu vào 1 trang A4.
 * Công thức hiệu chỉnh: ~3 dây ≈ 0,88; ~20 dây ≈ 0,48; nhiều dây thêm hệ số dự phòng (tên dây dài, xuống dòng).
 */
function printScaleForLineCount(lineCount: number): number {
  const n = Math.max(1, lineCount);
  let scale = 17.952 / (17.4 + n);
  if (n >= 16) scale *= 0.92;
  if (n >= 20) scale *= 0.94;
  return Math.min(0.9, Math.max(0.28, scale));
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
  logoImageDataUrl?: string;
  /** Để trống → dùng mẫu mặc định trên phiếu. */
  phieuGhiChu?: string;
};

export default function ThuTienChiTietPanel({
  members,
  rows,
  defaultMemberId,
  receiptSetting,
  deliverySlip,
}: {
  members: HuiMemberRef[];
  rows: HuiLineDetailRow[];
  defaultMemberId: string;
  receiptSetting: ReceiptSetting;
  /** Theo kỳ mở trang chi tiết — phiếu giao tiền cho người hốt. */
  deliverySlip?: PhieuGiaoSlipPayload | null;
}) {
  const [memberId, setMemberId] = useState(defaultMemberId || members[0]?.id || "");
  const selectedMember = useMemo(
    () => members.find((item) => item.id === memberId) ?? null,
    [members, memberId],
  );

  const displayRows = useMemo(() => rowsForMember(rows, selectedMember), [rows, selectedMember]);

  /** Phiếu tạm thu: hôm nay theo lịch VN + dây cùng kỳ với đợt đó nếu ngày khui lệch ≤ 7 ngày (tránh thiếu dây do UTC/DB). */
  const receiptRows = useMemo(() => filterRowsForPhieuTamThu(displayRows, new Date()), [displayRows]);

  const slipNoteLines = useMemo(
    () => slipNoteLinesFromSetting(receiptSetting.phieuGhiChu),
    [receiptSetting.phieuGhiChu],
  );
  const ghiChuCustomized = Boolean((receiptSetting.phieuGhiChu ?? "").trim());

  const summary = useMemo(() => {
    const totalSlots = receiptRows.reduce((acc, row) => acc + row.memberSlots, 0);
    const deadSlots = receiptRows.reduce(
      (acc, row) => acc + deadSlotsOnRowForMember(row, selectedMember),
      0,
    );
    const liveSlots = Math.max(0, totalSlots - deadSlots);
    // Dây đã hốt kỳ đang tính: không cộng tiền đóng (trừ ngang). Còn lại: chân sống × góp kỳ + chân chết × mức dây.
    const totalPayIn = receiptRows.reduce((acc, row) => {
      if (isMemberWinnerOnRow(row, selectedMember)) return acc;
      const contribution = row.latestContributionPerSlot || row.lineAmount;
      const dead = deadSlotsOnRowForMember(row, selectedMember);
      const live = Math.max(0, row.memberSlots - dead);
      return acc + contribution * live + dead * row.lineAmount;
    }, 0);
    const totalPayOut = receiptRows.reduce((acc, row) => {
      const contribution = row.latestContributionPerSlot || row.lineAmount;
      const isWinner = isMemberWinnerOnRow(row, selectedMember);
      return acc +
        (isWinner
          ? hoiTienDaTruCoTheoNhieuChan(row.totalCycles, row.memberSlots, contribution, row.lineTienCo)
          : 0);
    }, 0);
    const totalFutureDeadPay = receiptRows.reduce(
      (acc, row) => acc + futureDeadLegPayEstimate(row, selectedMember),
      0,
    );

    const bySameKy = new Map<string, { payIn: number; payOut: number }>();
    for (const row of receiptRows) {
      const key = khuiTrungKyGroupKey(row);
      const isWinner = isMemberWinnerOnRow(row, selectedMember);
      const contribution = row.latestContributionPerSlot || row.lineAmount;
      const dead = deadSlotsOnRowForMember(row, selectedMember);
      const live = Math.max(0, row.memberSlots - dead);
      const payIn = isWinner ? 0 : contribution * live + dead * row.lineAmount;
      const payOut = isWinner
        ? hoiTienDaTruCoTheoNhieuChan(row.totalCycles, row.memberSlots, contribution, row.lineTienCo)
        : 0;
      const bucket = bySameKy.get(key) ?? { payIn: 0, payOut: 0 };
      bucket.payIn += payIn;
      bucket.payOut += payOut;
      bySameKy.set(key, bucket);
    }
    let footerMustPay = 0;
    for (const b of bySameKy.values()) {
      footerMustPay += b.payIn - b.payOut;
    }

    return {
      totalSlots,
      deadSlots,
      liveSlots,
      totalPayIn,
      totalPayOut,
      totalFutureDeadPay,
      net: totalPayIn - totalPayOut,
      /** Tổng đóng − tổng hốt, chỉ bù trong từng nhóm trùng kỳ + trùng ngày khui */
      footerMustPay,
    };
  }, [receiptRows, selectedMember]);

  const [receiptNow, setReceiptNow] = useState(() => new Date());
  useEffect(() => {
    const bump = () => setReceiptNow(new Date());
    window.addEventListener("beforeprint", bump);
    const id = window.setInterval(bump, 60_000);
    return () => {
      window.removeEventListener("beforeprint", bump);
      window.clearInterval(id);
    };
  }, []);

  const currentDateText = formatViDateTime(receiptNow);
  const qrValue = `${receiptSetting.bankName || "BANK"}|${receiptSetting.bankAccount || "000000"}|${
    receiptSetting.accountName || receiptSetting.ownerName
  }`;
  const autoQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrValue)}`;
  const qrUrl = receiptSetting.qrImageDataUrl?.trim() || receiptSetting.qrImageUrl?.trim() || autoQrUrl;
  const ownerPhone = receiptSetting.phone?.trim() || "Chưa cập nhật";
  const ownerAddress = receiptSetting.address?.trim() || "Chưa cập nhật";
  const ownerBankAccount = receiptSetting.bankAccount?.trim() || "Chưa cập nhật";
  const ownerBankName = receiptSetting.bankName?.trim() || "";
  const ownerDisplayName = (receiptSetting.accountName || receiptSetting.ownerName || "Chủ hụi").trim();

  const printRootRef = useRef<HTMLDivElement>(null);
  const [pdfCapturing, setPdfCapturing] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const phoneLike = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isPhoneLikeDevice();
  }, []);

  useEffect(() => {
    setCanShareFiles(canSharePdfFiles());
  }, []);

  const handleSharePdf = useCallback(async () => {
    const el = printRootRef.current;
    if (!el) return;
    setReceiptNow(new Date());
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
      const base = safePdfFileBase(selectedMember?.name ?? "phieu");
      const fileName = `Phieu-dong-hoi-${base}.pdf`;
      const result = await sharePdfFile(blob, fileName, "Phiếu đóng hụi tạm tính", {
        useWebShare: onPhone,
      });
      if (result === "downloaded") {
        setShareHint(
          onPhone
            ? "Trình duyệt đã tải PDF. Mở Zalo hoặc Facebook và đính kèm file vừa tải."
            : "Đã tải file PDF về máy (thường là thư mục Tải xuống). Bạn có thể mở file hoặc gửi kèm qua Zalo, email.",
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
          `Lỗi màu CSS khi chụp phiếu: ${msg}. Hãy cập nhật trang hoặc dùng Chrome/Edge bản mới; có thể dùng nút In → Lưu PDF.`,
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
      const scale = printScaleForLineCount(receiptRows.length);
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
  }, [receiptRows.length]);

  return (
    <section className="min-h-[calc(100vh-140px)] rounded-2xl border border-slate-300 bg-white p-4 shadow-sm print:min-h-0 print:h-auto print:border-0 print:p-0 print:shadow-none">
      {deliverySlip ? (
        <PhieuGiaoHuiSection payload={deliverySlip} receiptSetting={receiptSetting} />
      ) : null}

      <div className="mb-4 flex flex-col gap-3 print:hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm text-slate-600">
            {!phoneLike ? (
              <>
                <span className="font-semibold text-slate-800">Máy tính:</span> bấm nút xanh để{" "}
                <span className="font-semibold">tải PDF trực tiếp</span> về máy (không mở hộp thoại chia sẻ Windows).
                Sau đó bạn mở file hoặc đính kèm vào Zalo/Email nếu cần.
              </>
            ) : canShareFiles ? (
              <>
                <span className="font-semibold text-slate-800">Điện thoại:</span> bấm nút xanh → trong bảng chia sẻ
                chọn <span className="font-semibold">Zalo</span>, <span className="font-semibold">Facebook</span> hoặc
                app khác. PDF được tạo nhẹ hơn trên màn hình nhỏ để gửi nhanh.
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-800">Điện thoại:</span> trình duyệt này không mở được bảng
                chia sẻ file — nút xanh sẽ <span className="font-semibold">tải PDF</span>; mở Zalo/FB và đính kèm file.
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
              In phiếu tạm thu
            </button>
          </div>
        </div>
        {shareHint ? <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">{shareHint}</p> : null}
      </div>

      <div
        ref={printRootRef}
        id="phieu-tam-thu-print"
        className="mx-auto w-full max-w-[1200px] overflow-hidden rounded-xl border border-slate-300 bg-white print:max-w-none print:rounded-none print:border-0 print:shadow-none print:leading-tight"
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
        <div className="text-center text-slate-900">
          <p className="text-3xl font-bold print:text-xl print:leading-tight">PHIẾU ĐÓNG HỤI TẠM TÍNH</p>
          <p className="mt-2 text-base font-semibold print:mt-0.5 print:text-xs">{currentDateText}</p>
        </div>
      </div>

      <div
        className={`grid gap-3 border-b border-slate-300 bg-slate-50 p-4 md:grid-cols-3 md:items-end print:hidden ${pdfCapturing ? "hidden" : ""}`}
      >
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Hụi viên</span>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
          >
            {members.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} - {item.phone}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          Điện thoại: {selectedMember?.phone || "-"}
        </div>
      </div>

      <div
        className={`border-b border-slate-300 bg-slate-50 p-4 print:block ${pdfCapturing ? "block" : "hidden"}`}
      >
        <p className="text-sm font-semibold text-slate-700">Hụi viên</p>
        <p className="mt-1 text-[17px] font-semibold text-slate-900">
          {selectedMember ? `${selectedMember.name} — ${selectedMember.phone}` : "-"}
        </p>
      </div>

      <div className="overflow-hidden border-b border-slate-300">
        <table className="min-w-full table-fixed text-sm">
          <thead className="bg-amber-100 text-slate-800">
            <tr className="border-b border-slate-300">
              <th className="border-r border-slate-300 px-3 py-2 text-center">Số dây</th>
              <th className="border-r border-slate-300 px-3 py-2 text-center">Số chân</th>
              <th className="border-r border-slate-300 px-3 py-2 text-center">Chết</th>
              <th className="border-r border-slate-300 px-3 py-2 text-center">Sống</th>
              <th
                className="border-r border-slate-300 px-3 py-2 text-center"
                title="Tổng tiền đóng kỳ đang tính: chân sống × mức góp kỳ + chân chết × mức dây. Dây đã hốt kỳ này trừ ngang với chủ nên không cộng."
              >
                Hụi sống (đã đóng)
              </th>
              <th
                className="border-r border-slate-300 px-3 py-2 text-center"
                title="Tiền người hốt thực nhận = gộp góp − tiền cò chủ (theo dây)"
              >
                Tiền hốt (đã trừ cò)
              </th>
              <th
                className="border-r border-slate-300 px-3 py-2 text-center"
                title="Ước lượng phần chân chết còn phải đóng tới mãn: chân chết × mức dây × số kỳ còn lại (chỉ hụi viên chưa hốt kỳ đang tính)."
              >
                Hụi Chết ( cần đóng )
              </th>
              <th className="border-r border-slate-300 px-3 py-2 text-center" title="Đã đóng − đã hốt (kỳ hiện tại)">
                Cân bằng
              </th>
              <th className="px-3 py-2 text-center" title="Đã hốt − đã đóng">
                Lợi nhuận ròng
              </th>
            </tr>
          </thead>
          <tbody className="bg-white text-center text-[15px] font-semibold text-slate-700 print:text-[10px]">
            <tr>
              <td className="border-r border-slate-300 px-3 py-2">{receiptRows.length}</td>
              <td className="border-r border-slate-300 px-3 py-2">{summary.totalSlots}</td>
              <td className="border-r border-slate-300 px-3 py-2 text-rose-700">{summary.deadSlots}</td>
              <td className="border-r border-slate-300 px-3 py-2 text-emerald-700">{summary.liveSlots}</td>
              <td className="border-r border-slate-300 px-3 py-2">{formatMoneyVN(summary.totalPayIn)}</td>
              <td className="border-r border-slate-300 px-3 py-2">{formatMoneyVN(summary.totalPayOut)}</td>
              <td className="border-r border-slate-300 px-3 py-2">{formatMoneyVN(summary.totalFutureDeadPay)}</td>
              <td className="border-r border-slate-300 px-3 py-2">{formatMoneyVN(summary.net)}</td>
              <td
                className={`px-3 py-2 font-semibold ${profitToneClass(summary.totalPayOut - summary.totalPayIn)}`}
              >
                {formatMoneyVN(summary.totalPayOut - summary.totalPayIn)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden border-b border-slate-300 print:[&_th]:px-0.5 print:[&_th]:py-0.5 print:[&_td]:px-0.5 print:[&_td]:py-0.5 print:[&_tbody]:text-[9px] print:[&_thead]:text-[8px]">
        <table className="min-w-full table-fixed text-sm print:text-[9px]">
          <thead className="bg-amber-100 text-slate-700">
            <tr className="border-b border-slate-300">
              <th className="w-12 border-r border-slate-300 px-2 py-3 text-center print:w-6">#</th>
              <th className="border-r border-slate-300 px-2 py-3 text-center">Dây hụi</th>
              <th className="border-r border-slate-300 px-2 py-3 text-center">Số tiền</th>
              <th className="w-20 border-r border-slate-300 px-2 py-3 text-center print:w-14">Kỳ hụi</th>
              <th className="w-24 border-r border-slate-300 px-2 py-3 text-center print:w-14">Tổng số kỳ</th>
              <th className="w-24 border-r border-slate-300 px-2 py-3 text-center print:w-16">Ngày hốt</th>
              <th className="w-24 border-r border-slate-300 px-2 py-3 text-center print:w-14">Bỏ thăm</th>
              <th className="w-16 border-r border-slate-300 px-2 py-3 text-center print:w-8">Chết</th>
              <th className="w-16 border-r border-slate-300 px-2 py-3 text-center print:w-8">Sống</th>
              <th
                className="border-r border-slate-300 px-2 py-3 text-center"
                title="Kỳ đang tính: chân sống × mức góp kỳ + chân chết × mức dây. Dây đã hốt kỳ này: trừ ngang với chủ, không ghi số đóng."
              >
                Tiền đóng
              </th>
              <th
                className="border-r border-slate-300 px-2 py-3 text-center"
                title="Đã trừ tiền cò chủ trên dây"
              >
                Tiền hốt (đã trừ cò)
              </th>
              <th className="border-r border-slate-300 px-2 py-3 text-center" title="Tiền hốt − tiền đóng (dòng này)">
                Lợi nhuận ròng
              </th>
              <th className="w-24 px-2 py-3 text-center print:w-14">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 bg-white text-center text-[15px] font-medium text-slate-700 print:text-[9px]">
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-6 text-slate-500">
                  Hụi viên này chưa tham gia dây hụi nào.
                </td>
              </tr>
            ) : receiptRows.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-6 text-slate-500">
                  Không có dây nào thuộc đợt phiếu tạm thu (hôm nay theo giờ Việt Nam, hoặc cùng kỳ với dây khui hôm
                  nay và ngày khui lệch tối đa 7 ngày).
                </td>
              </tr>
            ) : (
              receiptRows.map((row, idx) => {
                const isWinner = isMemberWinnerOnRow(row, selectedMember);
                const deadSlots = deadSlotsOnRowForMember(row, selectedMember);
                const liveSlots = Math.max(0, row.memberSlots - deadSlots);
                const contribution = row.latestContributionPerSlot || row.lineAmount;
                const payIn = isWinner ? 0 : contribution * liveSlots + deadSlots * row.lineAmount;
                const payOut = isWinner
                  ? hoiTienDaTruCoTheoNhieuChan(row.totalCycles, row.memberSlots, contribution, row.lineTienCo)
                  : 0;
                const rowNetProfit = payOut - payIn;
                return (
                  <tr key={`${row.lineId}-${idx}`}>
                    <td className="border-r border-slate-300 px-2 py-3">{idx + 1}</td>
                    <td className="border-r border-slate-300 px-2 py-3 text-left">{row.lineName}</td>
                    <td className="border-r border-slate-300 px-2 py-3">{formatMoneyVN(row.lineAmount)}</td>
                    <td className="border-r border-slate-300 px-2 py-3">{row.latestKy ? `Kỳ ${row.latestKy}` : "-"}</td>
                    <td className="border-r border-slate-300 px-2 py-3">{row.totalCycles}</td>
                    <td className="border-r border-slate-300 px-2 py-3">{formatDateDisplay(row.latestDate)}</td>
                    <td className="border-r border-slate-300 px-2 py-3">{row.latestBidAmount ? `-${formatMoneyVN(row.latestBidAmount)}` : "-"}</td>
                    <td className="border-r border-slate-300 px-2 py-3">{deadSlots}</td>
                    <td className="border-r border-slate-300 px-2 py-3">{liveSlots}</td>
                    <td className="border-r border-slate-300 px-2 py-3 text-emerald-800">
                      {isWinner ? (
                        <span className="font-semibold" title="Bù trừ với tiền chủ hụi giao, không thu đóng riêng">
                          Trừ ngang
                        </span>
                      ) : (
                        formatMoneyVN(payIn)
                      )}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-3">{formatMoneyVN(payOut)}</td>
                    <td className={`border-r border-slate-300 px-2 py-3 font-semibold ${profitToneClass(rowNetProfit)}`}>
                      {formatMoneyVN(rowNetProfit)}
                    </td>
                    <td className="px-2 py-3">{isWinner ? "Đã hốt" : "-"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 border-b border-slate-300 bg-amber-100 p-4 md:grid-cols-[1fr_auto] md:items-center print:gap-2 print:p-2">
        <div className="text-center md:text-left">
          <p className="text-2xl font-bold text-slate-900 print:text-sm print:leading-snug">
            TỔNG SỐ TIỀN HỤI VIÊN PHẢI ĐÓNG: {selectedMember?.name?.toUpperCase() || "-"}
          </p>
          <p className="mt-1 text-xs font-normal text-slate-600 print:mt-0.5 print:text-[9px] print:leading-tight">
            <span className="font-semibold">Trừ ngang</span> (cột Tiền đóng): hụi viên{" "}
            <span className="font-semibold">đã hốt kỳ đang tính</span> của dây đó không nộp tiền đóng riêng kỳ
            này — khoản được <span className="font-semibold">bù trừ với tiền chủ hụi giao</span>, nên không hiện số
            đồng như các dây vẫn phải đóng. Các dây khác:{" "}
            <span className="font-semibold">chân sống</span> theo mức góp kỳ,{" "}
            <span className="font-semibold">chân chết</span> (đã hốt trước đó) theo mức dây mỗi kỳ.
          </p>
        </div>
        <p
          className="text-center text-3xl font-bold text-slate-900 print:text-xl print:tabular-nums"
          title="Tổng (đóng − hốt) theo từng nhóm trùng kỳ & ngày khui, rồi cộng lại. Âm: trong đợt đó đã hốt nhiều hơn đóng."
        >
          {formatMoneyVN(summary.footerMustPay)}
        </p>
      </div>

      <div className="grid gap-0 md:grid-cols-[1fr_260px] print:grid-cols-[1fr_118px] print:items-start">
        <div className="border-r border-slate-300 bg-white p-4 print:p-2">
          <p className="text-center text-xl font-bold text-slate-900 print:text-sm">GHI CHÚ</p>
          <div className="mt-3 space-y-2 text-base font-semibold text-slate-800 print:mt-1 print:space-y-0.5 print:text-[10px] print:leading-snug">
            {slipNoteLines.map((line, idx) => (
              <p
                key={`${idx}-${line.slice(0, 24)}`}
                className={!ghiChuCustomized && idx === 1 ? "pl-7 print:pl-4" : undefined}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
        <div className="bg-white p-4 text-center print:p-1">
          <p className="text-sm font-semibold text-slate-700 print:text-[9px]">Quét mã thanh toán</p>
          <img
            src={qrUrl}
            alt="QR thanh toán"
            crossOrigin={qrUrl.startsWith("data:") ? undefined : "anonymous"}
            className="mx-auto mt-2 h-[210px] w-[210px] rounded-lg border border-slate-300 bg-white p-2 print:mt-1 print:h-[92px] print:w-[92px] print:p-0.5"
          />
          <p className="mt-2 text-sm font-semibold text-slate-800 print:mt-0.5 print:text-[9px] print:leading-tight">
            {receiptSetting.accountName || receiptSetting.ownerName}
          </p>
          <p className="text-xs text-slate-600 print:text-[8px]">{receiptSetting.bankAccount || "-"}</p>
        </div>
      </div>
      </div>
    </section>
  );
}
