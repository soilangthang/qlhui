"use client";

import { useMemo, useState } from "react";

import { buildMemberBalanceReport, type MemberBalanceRow } from "@/lib/bao-cao-hui-vien";
import {
  formatMoneyVN,
  profitToneClass,
  type HuiLineDetailRow,
  type HuiMemberRef,
} from "@/lib/hui-member-line-metrics";

const TOP_N = 5;

function normalizeSearch(s: string) {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\u00a0\u2000-\u200b\u202f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function BaoCaoPanel({
  members,
  rows,
}: {
  members: HuiMemberRef[];
  rows: HuiLineDetailRow[];
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"balance" | "name" | "lines">("balance");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const report = useMemo(() => buildMemberBalanceReport(members, rows), [members, rows]);

  const q = normalizeSearch(query);
  const qDigits = q.replace(/\D/g, "");

  const filtered = useMemo(() => {
    if (!q) return report;
    return report.filter(({ member }) => {
      const name = normalizeSearch(member.name);
      const phone = member.phone.replace(/\D/g, "");
      return (
        name.includes(q) ||
        member.phone.toLowerCase().includes(q) ||
        (qDigits.length >= 3 && phone.includes(qDigits))
      );
    });
  }, [report, q, qDigits]);

  const sortedTable = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "desc" ? -1 : 1;
    arr.sort((a, b) => {
      if (sortKey === "balance") {
        const c = (a.tongThucHien - b.tongThucHien) * dir;
        if (c !== 0) return c;
      } else if (sortKey === "lines") {
        const c = (a.soDay - b.soDay) * dir;
        if (c !== 0) return c;
      }
      return a.member.name.localeCompare(b.member.name, "vi", { sensitivity: "base" });
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const topDuong = useMemo(() => {
    return [...report]
      .filter((r) => r.tongThucHien > 0)
      .sort((a, b) => b.tongThucHien - a.tongThucHien)
      .slice(0, TOP_N);
  }, [report]);

  const topAm = useMemo(() => {
    return [...report]
      .filter((r) => r.tongThucHien < 0)
      .sort((a, b) => a.tongThucHien - b.tongThucHien)
      .slice(0, TOP_N);
  }, [report]);

  const aggregate = useMemo(() => {
    let sumPos = 0;
    let sumNeg = 0;
    let nPos = 0;
    let nNeg = 0;
    for (const r of report) {
      if (r.tongThucHien > 0) {
        sumPos += r.tongThucHien;
        nPos += 1;
      } else if (r.tongThucHien < 0) {
        sumNeg += r.tongThucHien;
        nNeg += 1;
      }
    }
    return { sumPos, sumNeg, nPos, nNeg, totalMembers: report.length };
  }, [report]);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  return (
    <div className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-600/80 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-5 py-8 text-white shadow-2xl shadow-slate-900/40 md:px-10 md:py-10">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Báo cáo tổng hợp</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white drop-shadow-sm md:text-4xl">
            Âm — dương theo hụi viên
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-100">
            Số liệu theo <span className="font-semibold text-white">các kỳ đã giao tiền</span> (đã thực hiện), cộng
            trên mọi dây có chân — góc nhìn <span className="font-semibold text-white">chủ hụi</span>.{" "}
            <span className="font-semibold text-emerald-300">Dương</span>: hụi viên{" "}
            <span className="font-semibold text-emerald-200">đóng nhiều hơn hốt</span>.{" "}
            <span className="font-semibold text-rose-300">Âm</span>:{" "}
            <span className="font-semibold text-rose-200">hốt nhiều hơn đóng</span>.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-500/70 bg-slate-800/95 p-4 shadow-inner shadow-black/20 transition duration-300 hover:border-slate-400 hover:bg-slate-800">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-200">Hụi viên</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">{aggregate.totalMembers}</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/50 bg-emerald-900/80 p-4 shadow-md shadow-emerald-950/40 transition duration-300 hover:border-emerald-300/70">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-100">Tổng dương ({aggregate.nPos})</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-emerald-50 md:text-2xl">
                +{formatMoneyVN(aggregate.sumPos)}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-400/50 bg-rose-900/80 p-4 shadow-md shadow-rose-950/40 transition duration-300 hover:border-rose-300/70">
              <p className="text-xs font-bold uppercase tracking-wide text-rose-100">Tổng âm ({aggregate.nNeg})</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-rose-50 md:text-2xl">
                {formatMoneyVN(aggregate.sumNeg)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <TopCard
          title="Top dương"
          subtitle="Đóng nhiều hơn hốt (cao nhất)"
          variant="positive"
          items={topDuong}
        />
        <TopCard title="Top âm" subtitle="Hốt nhiều hơn đóng (sâu nhất)" variant="negative" items={topAm} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h2 className="text-lg font-bold text-slate-900">Chi tiết từng hụi viên</h2>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên hoặc SĐT…"
            className="w-full max-w-xs rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            aria-label="Lọc báo cáo"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-700">
                <th className="px-4 py-3 font-bold">#</th>
                <th className="px-4 py-3 font-bold">
                  <button
                    type="button"
                    onClick={() => toggleSort("name")}
                    className="rounded-lg font-bold text-slate-800 hover:bg-slate-200/60 px-2 py-1 -mx-2 transition"
                  >
                    Họ tên {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
                <th className="px-4 py-3 font-bold">SĐT</th>
                <th className="px-4 py-3 text-center font-bold">
                  <button
                    type="button"
                    onClick={() => toggleSort("lines")}
                    className="rounded-lg font-bold hover:bg-slate-200/60 px-2 py-1 -mx-2 transition"
                  >
                    Số dây {sortKey === "lines" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-bold">
                  <button
                    type="button"
                    onClick={() => toggleSort("balance")}
                    className="rounded-lg font-bold hover:bg-slate-200/60 px-2 py-1 -mx-2 transition"
                  >
                    Tổng âm/dương {sortKey === "balance" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTable.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    Không có dữ liệu hoặc không khớp tìm kiếm.
                  </td>
                </tr>
              ) : (
                sortedTable.map((row, idx) => (
                  <tr
                    key={row.member.id}
                    className="group transition duration-200 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-transparent"
                  >
                    <td className="px-4 py-3 tabular-nums text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.member.name}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{row.member.phone}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-slate-700">{row.soDay}</td>
                    <td
                      className={`px-4 py-3 text-right text-base font-bold tabular-nums transition group-hover:scale-[1.02] ${profitToneClass(row.tongThucHien)}`}
                    >
                      {row.tongThucHien > 0 ? "+" : ""}
                      {formatMoneyVN(row.tongThucHien)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function TopCard({
  title,
  subtitle,
  variant,
  items,
}: {
  title: string;
  subtitle: string;
  variant: "positive" | "negative";
  items: MemberBalanceRow[];
}) {
  const isPos = variant === "positive";
  const border = isPos ? "border-emerald-400/60" : "border-rose-400/60";
  const glow = isPos ? "shadow-emerald-900/30" : "shadow-rose-900/30";
  const grad = isPos
    ? "from-emerald-900 via-slate-800 to-slate-900"
    : "from-rose-900 via-slate-800 to-slate-900";
  const accent = isPos ? "from-emerald-400 to-teal-500" : "from-rose-400 to-orange-500";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${border} bg-gradient-to-br ${grad} p-5 text-white shadow-2xl ${glow} transition duration-500 hover:-translate-y-1 hover:brightness-110`}
    >
      <div
        className={`pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl`}
        aria-hidden
      />
      <div className="relative">
        <h3 className="text-xl font-extrabold tracking-tight text-white drop-shadow-sm">{title}</h3>
        <p className="mt-1 text-xs font-semibold text-slate-200">{subtitle}</p>
        <ul className="mt-5 space-y-3">
          {items.length === 0 ? (
            <li className="rounded-xl border border-slate-500/50 bg-slate-800/80 py-6 text-center text-sm font-medium text-slate-200">
              Chưa có dữ liệu
            </li>
          ) : (
            items.map((row, i) => (
              <li
                key={row.member.id}
                className="flex items-center gap-3 rounded-xl border border-slate-500/50 bg-slate-800/70 px-3 py-2.5 transition duration-300 hover:border-slate-400 hover:bg-slate-800/90"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${accent} text-sm font-black text-white shadow-lg ring-2 ring-white/20`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{row.member.name}</p>
                  <p className="truncate text-xs font-medium text-slate-300">{row.member.phone}</p>
                </div>
                <p
                  className={`shrink-0 text-right text-sm font-bold tabular-nums ${
                    isPos ? "text-emerald-200" : "text-rose-200"
                  }`}
                >
                  {row.tongThucHien > 0 ? "+" : ""}
                  {formatMoneyVN(row.tongThucHien)}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
