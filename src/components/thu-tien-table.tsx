"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ThuTienRow = {
  id: string;
  huiLineId: string;
  huiLineName: string;
  kyThu: number;
  ngayKhui: string;
  grossPayout: number;
  status: "CHO_GIAO_TIEN" | "DA_GIAO_TIEN";
};

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

export default function ThuTienTable({ initialRows }: { initialRows: ThuTienRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const q = searchQuery.trim().toLowerCase();
  const visibleRows = !q
    ? rows
    : rows.filter((item) => {
        const statusLabel = item.status === "DA_GIAO_TIEN" ? "hoàn thành" : "chờ giao tiền";
        const blob = [
          item.huiLineName,
          `kỳ ${item.kyThu}`,
          String(item.kyThu),
          formatDateDisplay(item.ngayKhui),
          formatMoneyVN(item.grossPayout),
          String(item.grossPayout),
          statusLabel,
        ]
          .join(" ")
          .toLowerCase();
        return blob.includes(q);
      });

  async function confirmPaid(openingId: string) {
    setLoadingId(openingId);
    setError("");
    try {
      const res = await fetch(`/api/thu-tien/${openingId}`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể xác nhận thu đủ");
        return;
      }
      setRows((prev) =>
        prev.map((row) => (row.id === openingId ? { ...row, status: "DA_GIAO_TIEN" } : row)),
      );
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ");
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
          placeholder="Tìm theo dây hụi, kỳ, ngày hốt, số tiền…"
          className="w-full max-w-md rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 sm:ml-auto"
          aria-label="Tìm kỳ thu tiền"
        />
      </div>
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      <div className="overflow-hidden rounded-xl border border-slate-300">
        <table className="min-w-full table-fixed text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr className="border-b border-slate-300">
              <th className="border-r border-slate-300 px-3 py-3 text-center">Dây hụi</th>
              <th className="border-r border-slate-300 px-3 py-3 text-center">Kỳ</th>
              <th className="border-r border-slate-300 px-3 py-3 text-center">Hụi viên</th>
              <th className="border-r border-slate-300 px-3 py-3 text-center">Ngày hốt</th>
              <th className="border-r border-slate-300 px-3 py-3 text-center">Số tiền cần thu</th>
              <th className="border-r border-slate-300 px-3 py-3 text-center">Trạng thái</th>
              <th className="px-3 py-3 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 bg-white text-center text-[15px] font-medium text-slate-700">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-slate-500">
                  Không có kỳ nào chờ giao tiền.
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-slate-500">
                  Không có kỳ khớp tìm kiếm.
                </td>
              </tr>
            ) : (
              visibleRows.map((item) => (
                <tr key={item.id}>
                  <td className="border-r border-slate-300 px-3 py-3">{item.huiLineName}</td>
                  <td className="border-r border-slate-300 px-3 py-3">Kỳ {item.kyThu}</td>
                  <td className="border-r border-slate-300 px-3 py-3">
                    <Link
                      href={`/thu-tien/${item.id}/chi-tiet`}
                      className="inline-flex rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700"
                    >
                      Chi tiết
                    </Link>
                  </td>
                  <td className="border-r border-slate-300 px-3 py-3">{formatDateDisplay(item.ngayKhui)}</td>
                  <td className="border-r border-slate-300 px-3 py-3 text-lg font-semibold tabular-nums text-emerald-700">
                    {formatMoneyVN(item.grossPayout)}
                  </td>
                  <td className="border-r border-slate-300 px-3 py-3">
                    {item.status === "DA_GIAO_TIEN" ? "Hoàn thành" : "Chờ giao tiền"}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => void confirmPaid(item.id)}
                      disabled={item.status === "DA_GIAO_TIEN" || loadingId === item.id}
                      className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                    >
                      {loadingId === item.id ? "Đang xác nhận" : "Xác nhận thu đủ"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
