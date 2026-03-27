"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { deleteClientCacheByPrefix } from "@/lib/client-query-cache";

type ThuTienRow = {
  id: string;
  huiLineId: string;
  huiLineName: string;
  huiLineKind: "THUONG" | "GOP";
  huiLineGopCycleDays: number | null;
  kyThu: number;
  ngayKhui: string;
  collectedNowAmount: number;
  amountToCollect: number;
  amountToDeliver: number;
  status: "CHO_GIAO_TIEN" | "DA_GIAO_TIEN";
};

function sortRows(rows: ThuTienRow[]) {
  return [...rows].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "CHO_GIAO_TIEN" ? -1 : 1;
    }
    const dateDiff = new Date(b.ngayKhui).getTime() - new Date(a.ngayKhui).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.kyThu - a.kyThu;
  });
}

function formatDateDisplay(value: string) {
  const date = new Date(value);
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatMoneyVN(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function statusLabel(item: ThuTienRow) {
  if (item.huiLineKind === "GOP") {
    return item.status === "DA_GIAO_TIEN" ? "Đã chốt góp kỳ này" : "Đang gom góp";
  }
  return item.status === "DA_GIAO_TIEN" ? "Đã xác nhận giao" : "Chờ giao tiền";
}

function completedActionLabel(item: ThuTienRow) {
  return item.huiLineKind === "GOP" ? "Đã chốt góp kỳ này" : "Đã xác nhận giao";
}

function pendingActionLabel(item: ThuTienRow) {
  return item.huiLineKind === "GOP" ? "Xác nhận đã gom kỳ" : "Xác nhận thu đủ";
}

export default function ThuTienTable({ initialRows }: { initialRows: ThuTienRow[] }) {
  const [rows, setRows] = useState(() => sortRows(initialRows));
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const q = searchQuery.trim().toLowerCase();
  const visibleRows = useMemo(() => {
    if (!q) return rows;
    return rows.filter((item) => {
      const blob = [
        item.huiLineName,
        `kỳ ${item.kyThu}`,
        String(item.kyThu),
        formatDateDisplay(item.ngayKhui),
        formatMoneyVN(item.collectedNowAmount),
        formatMoneyVN(item.amountToDeliver),
        String(item.collectedNowAmount),
        String(item.amountToDeliver),
        statusLabel(item),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [q, rows]);

  const totals = useMemo(() => {
    const gopRows = visibleRows.filter((row) => row.huiLineKind === "GOP");
    const totalCollected = gopRows.reduce((sum, row) => sum + row.collectedNowAmount, 0);
    const totalDelivery = gopRows.reduce((sum, row) => sum + row.amountToDeliver, 0);
    return {
      gopCount: gopRows.length,
      totalCollected,
      totalDelivery,
    };
  }, [visibleRows]);

  async function confirmPaid(openingId: string) {
    setLoadingId(openingId);
    setError("");
    try {
      const res = await fetch(`/api/thu-tien/${openingId}`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể xác nhận.");
        return;
      }
      setRows((prev) =>
        sortRows(prev.map((row) => (row.id === openingId ? { ...row, status: "DA_GIAO_TIEN" } : row))),
      );
      deleteClientCacheByPrefix("chi-tiet-hui-vien:");
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      <div className="mb-3 flex w-full justify-stretch">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm theo dây hụi, kỳ, ngày hốt, số tiền..."
          className="w-full max-w-md rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 sm:ml-auto"
          aria-label="Tìm kỳ thu tiền"
        />
      </div>
      {totals.gopCount > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="font-semibold">Tổng đã thu góp hiện có:</span> {formatMoneyVN(totals.totalCollected)}
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <span className="font-semibold">Tổng sẽ giao khi đủ kỳ:</span> {formatMoneyVN(totals.totalDelivery)}
          </div>
        </div>
      ) : null}
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-slate-300 print:overflow-visible">
        <table className="w-max min-w-[820px] table-fixed text-xs sm:min-w-full sm:text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr className="border-b border-slate-300">
              <th className="border-r border-slate-300 px-2 py-3 text-center sm:px-3">Dây hụi</th>
              <th className="border-r border-slate-300 px-2 py-3 text-center sm:px-3">Kỳ</th>
              <th className="border-r border-slate-300 px-2 py-3 text-center sm:px-3">Hụi viên</th>
              <th className="border-r border-slate-300 px-2 py-3 text-center sm:px-3">Ngày hốt</th>
              <th className="border-r border-slate-300 px-2 py-3 text-center sm:px-3">Đã thu góp hiện có</th>
              <th className="border-r border-slate-300 px-2 py-3 text-center sm:px-3">Sẽ giao khi đủ kỳ</th>
              <th className="border-r border-slate-300 px-2 py-3 text-center sm:px-3">Trạng thái</th>
              <th className="px-2 py-3 text-center sm:px-3">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 bg-white text-center text-[13px] font-medium text-slate-700 sm:text-[15px]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-slate-500">
                  Không có kỳ nào trong danh sách thu tiền.
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-slate-500">
                  Không có kỳ khớp tìm kiếm.
                </td>
              </tr>
            ) : (
              visibleRows.map((item) => {
                return (
                  <tr key={item.id}>
                    <td className="border-r border-slate-300 px-2 py-3 sm:px-3">{item.huiLineName}</td>
                    <td className="border-r border-slate-300 px-2 py-3 text-center sm:px-3">Kỳ {item.kyThu}</td>
                    <td className="border-r border-slate-300 px-2 py-3 sm:px-3">
                      <Link
                        href={`/thu-tien/${item.id}/chi-tiet`}
                        className="inline-flex rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700"
                      >
                        Chi tiết
                      </Link>
                    </td>
                    <td className="border-r border-slate-300 px-2 py-3 sm:px-3">{formatDateDisplay(item.ngayKhui)}</td>
                    <td className="border-r border-slate-300 px-2 py-3 text-base font-semibold tabular-nums text-sky-700 sm:px-3 sm:text-lg">
                      {formatMoneyVN(item.collectedNowAmount)}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-3 sm:px-3">
                      <div className="text-base font-semibold tabular-nums text-emerald-700 sm:text-lg">
                        {formatMoneyVN(item.amountToDeliver)}
                      </div>
                      {item.huiLineKind === "GOP" ? (
                        <div className="mt-1 text-[11px] font-semibold text-amber-700 sm:text-xs">
                          Chỉ giao khi đã gom đủ kỳ
                        </div>
                      ) : null}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-3 sm:px-3">
                      <div>{statusLabel(item)}</div>
                      {item.huiLineKind === "GOP" ? (
                        <div className="mt-1 text-[11px] font-semibold text-sky-700 sm:text-xs">
                          Đã gom đến hiện tại: {formatMoneyVN(item.collectedNowAmount)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-2 py-3 sm:px-3">
                      {item.status === "DA_GIAO_TIEN" ? (
                        <span className="inline-flex rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500">
                          {completedActionLabel(item)}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void confirmPaid(item.id)}
                          disabled={loadingId === item.id}
                          className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                        >
                          {loadingId === item.id ? "Đang xác nhận" : pendingActionLabel(item)}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
