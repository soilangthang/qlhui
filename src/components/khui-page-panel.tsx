"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { assertKhuiDateIsToday } from "@/lib/local-calendar";

type HuiLeg = {
  id: string;
  stt: number;
  memberName: string | null;
  memberPhone: string | null;
};

type KhuiResult = {
  openingId: string;
  winnerName: string;
  kyThu: number;
  ngayHot: string;
  finalPayout: number;
  status: "CHO_GIAO_TIEN" | "DA_GIAO_TIEN";
};

async function fetchWithRetry(url: string, retries = 1, delayMs = 250) {
  let lastError: unknown = null;
  for (let i = 0; i <= retries; i += 1) {
    try {
      const response = await fetch(url);
      return response;
    } catch (error) {
      lastError = error;
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError ?? new Error("Request failed");
}

function formatDateDisplay(date: Date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function parseDdMmYyyy(value: string): Date | null {
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatMoneyVN(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export default function KhuiPagePanel({ lineId }: { lineId: string }) {
  const router = useRouter();
  const cacheKey = `khui-page-cache:${lineId}`;
  const [lineName, setLineName] = useState("");
  const [lineKind, setLineKind] = useState<"THUONG" | "GOP">("THUONG");
  const [lineGopCycleDays, setLineGopCycleDays] = useState<number | null>(null);
  const [lineFixedBid, setLineFixedBid] = useState<number | null>(null);
  const [legs, setLegs] = useState<HuiLeg[]>([]);
  const [winnerLegId, setWinnerLegId] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [ngayKhui, setNgayKhui] = useState(formatDateDisplay(new Date()));
  const [submitting, setSubmitting] = useState(false);
  const [confirmingPaid, setConfirmingPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<KhuiResult | null>(null);

  const winnerOptions = useMemo(() => legs, [legs]);
  const selectedWinner = winnerOptions.find((leg) => leg.id === winnerLegId) ?? null;
  const detailWinnerName = result
    ? result.winnerName
    : selectedWinner
      ? `${selectedWinner.memberName || "Chưa gán hụi viên"}${selectedWinner.memberPhone ? ` (${selectedWinner.memberPhone})` : ""}`
      : "-";
  const detailKyThu = result ? `Kỳ ${result.kyThu}` : "-";
  const detailNgayHot = result ? result.ngayHot : ngayKhui.trim() || "-";
  const detailPayout = result ? formatMoneyVN(result.finalPayout) : "-";
  const detailStatus =
    result?.status === "CHO_GIAO_TIEN"
      ? "Chờ giao tiền"
      : result?.status === "DA_GIAO_TIEN"
        ? "Đã giao tiền"
        : "Chưa xác nhận";

  useEffect(() => {
    if (winnerOptions.length === 0) {
      setWinnerLegId("");
      return;
    }
    if (!winnerOptions.some((leg) => leg.id === winnerLegId)) {
      setWinnerLegId(winnerOptions[0].id);
    }
  }, [winnerOptions, winnerLegId]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (!raw) return;
      const cached = JSON.parse(raw) as {
        lineName?: string;
        legs?: HuiLeg[];
      };
      if (cached.lineName) setLineName(cached.lineName);
      if (Array.isArray(cached.legs)) setLegs(cached.legs);
      // Không cache result/trạng thái: tránh hiển thị "Đã giao tiền" sai; trạng thái chỉ theo server.
    } catch {
      // Ignore invalid cache data.
    }
  }, [cacheKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify({ lineName, legs }));
    } catch {
      // Ignore storage write errors.
    }
  }, [cacheKey, lineName, legs]);

  function applyLinePayload(lineData: {
    line?: {
      name?: string;
      kind?: "THUONG" | "GOP";
      gopCycleDays?: number | null;
      fixedBid?: number | null;
    };
    name?: string;
    latestOpening?: {
      id?: string;
      winnerName?: string;
      kyThu?: number;
      ngayKhui?: string;
      finalPayout?: number;
      status?: KhuiResult["status"];
    } | null;
    legs?: HuiLeg[];
  }) {
    setLineName(lineData.line?.name ?? lineData.name ?? "");
    setLineKind(lineData.line?.kind === "GOP" ? "GOP" : "THUONG");
    setLineGopCycleDays(lineData.line?.gopCycleDays ?? null);
    setLineFixedBid(lineData.line?.fixedBid ?? null);
    if (lineData.line?.kind === "GOP") {
      setBidAmount(String(lineData.line.fixedBid ?? 0));
    }
    if (lineData.latestOpening) {
      const o = lineData.latestOpening;
      const st = o.status === "DA_GIAO_TIEN" || o.status === "CHO_GIAO_TIEN" ? o.status : "CHO_GIAO_TIEN";
      setResult({
        openingId: o.id ?? "",
        winnerName: o.winnerName ?? "-",
        kyThu: o.kyThu ?? 0,
        ngayHot: o.ngayKhui ? formatDateDisplay(new Date(o.ngayKhui)) : "-",
        finalPayout: o.finalPayout ?? 0,
        status: st,
      });
    } else {
      setResult(null);
    }
    if (Array.isArray(lineData.legs)) {
      const nextLegs = lineData.legs;
      setLegs(nextLegs);
      const firstWinner = nextLegs.find((leg) => !!leg.memberName) ?? nextLegs[0];
      setWinnerLegId(firstWinner?.id ?? "");
    }
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const lineRes = await fetchWithRetry(`/api/day-hui/${lineId}`, 1, 350);
        const lineData = await lineRes.json();

        if (lineRes.ok) {
          applyLinePayload(lineData);
        } else {
          setLineName((prev) => prev || lineId);
          const isNotFound = lineRes.status === 404 || lineData?.message?.includes("không tồn tại");
          if (isNotFound) {
            setError("Dây hụi không tồn tại hoặc đã bị xóa. Đang quay lại danh sách dây hụi...");
            setTimeout(() => router.replace("/day-hui"), 900);
          } else {
            const hasLocalData = legs.length > 0 || Boolean(result);
            setError(
              hasLocalData
                ? "Mất kết nối tạm thời, đang hiển thị dữ liệu gần nhất."
                : lineData.message ?? "Không tải được dữ liệu khui",
            );
          }
        }
      } catch {
        const hasLocalData = legs.length > 0 || Boolean(result);
        setError(
          hasLocalData
            ? "Mất kết nối tạm thời, đang hiển thị dữ liệu gần nhất."
            : "Không thể kết nối máy chủ",
        );
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [lineId, router]);

  async function submitKhui() {
    if (!winnerLegId || !ngayKhui.trim()) return;
    const parsedNgay = parseDdMmYyyy(ngayKhui.trim());
    if (!parsedNgay) {
      setError("Ngày khui không hợp lệ (dd/mm/yyyy).");
      return;
    }
    const ngayErr = assertKhuiDateIsToday(parsedNgay);
    if (ngayErr) {
      setError(ngayErr);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const parsedBid = Number(lineKind === "GOP" ? String(lineFixedBid ?? 0) : bidAmount || "0");
      const safeBidAmount = Number.isNaN(parsedBid) || parsedBid < 0 ? 0 : Math.floor(parsedBid);
      const res = await fetch(`/api/day-hui/${lineId}/khui`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerLegId,
          bidAmount: safeBidAmount,
          ngayKhui: ngayKhui.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể khui dây hụi");
        return;
      }
      const syncRes = await fetch(`/api/day-hui/${lineId}`);
      const lineData = await syncRes.json();
      if (syncRes.ok) {
        applyLinePayload(lineData);
      } else {
        const winner = winnerOptions.find((leg) => leg.id === winnerLegId);
        setResult({
          openingId: data.openingId ?? "",
          winnerName: winner?.memberName || `Chân ${winner?.stt ?? "-"}`,
          kyThu: data.kyThu,
          ngayHot: ngayKhui.trim(),
          finalPayout: data.payout?.finalPayout ?? 0,
          status: "CHO_GIAO_TIEN",
        });
      }
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelivered() {
    if (!result?.openingId || result.status === "DA_GIAO_TIEN") return;
    setConfirmingPaid(true);
    setError("");
    try {
      const res = await fetch(`/api/thu-tien/${result.openingId}`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể xác nhận giao tiền");
        return;
      }
      const syncRes = await fetch(`/api/day-hui/${lineId}`);
      const lineData = await syncRes.json();
      if (syncRes.ok) {
        applyLinePayload(lineData);
      } else {
        setResult((prev) => (prev ? { ...prev, status: "DA_GIAO_TIEN" } : prev));
      }
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setConfirmingPaid(false);
    }
  }

  return (
    <section className="min-h-[calc(100vh-140px)] rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Khui dây hụi</h2>
      <p className="mt-1 text-sm text-slate-600">Dây hụi: {lineName || lineId}</p>

      <div className="mt-4 grid gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4 md:grid-cols-3 md:items-end">
        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Người hốt</span>
          <select
            value={winnerLegId}
            onChange={(e) => setWinnerLegId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
          >
            {winnerOptions.length === 0 ? (
              <option value="">Chưa có chân để chọn</option>
            ) : null}
            {winnerOptions.map((leg) => (
              <option key={leg.id} value={leg.id}>
                Chân {leg.stt} - {leg.memberName || "Chưa gán hụi viên"}
                {leg.memberPhone ? ` (${leg.memberPhone})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Giá thăm</span>
          <input
            type="number"
            min={0}
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            disabled={lineKind === "GOP"}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
            placeholder={lineKind === "GOP" ? "Giá thăm cố định từ lúc tạo dây" : "VD: 200000"}
          />
          {lineKind === "GOP" ? (
            <span className="text-xs text-slate-500">
              Dây góp {lineGopCycleDays ?? 1} ngày/kỳ • thăm cố định {formatMoneyVN(lineFixedBid ?? 0)}
            </span>
          ) : null}
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Ngày khui</span>
          <input
            value={ngayKhui}
            onChange={(e) => setNgayKhui(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
            placeholder="dd/mm/yyyy"
          />
          <span className="text-xs text-slate-500">Chỉ được khui đúng ngày hôm nay (theo lịch máy).</span>
        </label>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => void submitKhui()}
          disabled={!winnerLegId || submitting}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Đang xác nhận..." : "Xác nhận khui"}
        </button>
      </div>

      {loading ? <p className="mt-3 text-sm text-slate-500">Đang đồng bộ dữ liệu hệ thống...</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-300">
        <table className="min-w-full table-fixed text-[15px]">
          <thead className="bg-slate-50 text-slate-700">
            <tr className="border-b border-slate-300">
              <th className="border-r border-slate-300 px-3 py-3 text-center">Hụi viên</th>
              <th className="border-r border-slate-300 px-3 py-3 text-center">Hốt kỳ</th>
              <th className="border-r border-slate-300 px-3 py-3 text-center">Ngày hốt</th>
              <th className="border-r border-slate-300 px-3 py-3 text-center">Số tiền được nhận</th>
              <th className="border-r border-slate-300 px-3 py-3 text-center">Trạng thái</th>
              <th className="px-3 py-3 text-center" title="Sau khi giao tiền mặt cho người hốt, bấm xác nhận">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="bg-white text-center font-medium text-slate-700">
            <tr>
              <td className="border-r border-slate-300 px-3 py-3">{detailWinnerName}</td>
              <td className="border-r border-slate-300 px-3 py-3">{detailKyThu}</td>
              <td className="border-r border-slate-300 px-3 py-3">{detailNgayHot}</td>
              <td className="border-r border-slate-300 px-3 py-3">{detailPayout}</td>
              <td className="border-r border-slate-300 px-3 py-3">{detailStatus}</td>
              <td className="px-3 py-3">
                {result?.openingId && result.status === "CHO_GIAO_TIEN" ? (
                  <button
                    type="button"
                    onClick={() => void confirmDelivered()}
                    disabled={confirmingPaid}
                    title="Chủ hụi đã giao đủ tiền cho người hốt"
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {confirmingPaid ? "Đang lưu..." : "Xác nhận"}
                  </button>
                ) : result?.openingId && result.status === "DA_GIAO_TIEN" ? (
                  <span className="text-sm font-medium text-slate-500">Đã xác nhận</span>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
