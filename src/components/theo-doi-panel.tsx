"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { TheoDoiLinePayload } from "@/lib/theo-doi-data";

function formatMoneyVN(n: number) {
  return `${n.toLocaleString("vi-VN")}đ`;
}

function formatDateDisplay(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function openingStatusLabel(status: string) {
  if (status === "DA_GIAO_TIEN") return "Đã giao tiền";
  return "Chờ giao tiền";
}

/** Chuẩn hóa chuỗi tìm kiếm / tên dây (khoảng trắng lạ, ký tự ẩn, Unicode). */
function normalizeSearchText(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\u00a0\u2000-\u200b\u202f\u2060\ufeff]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Khớp tên dây / tên hụi viên: substring sau chuẩn hóa, hoặc bỏ hết khoảng trắng (vd. "N 1 tr" ↔ "N1tr"),
 * hoặc có nhiều từ thì chỉ cần một từ trùng tên dây (vd. "dây n1tr" vẫn ra "N1tr").
 */
function haystackMatchesQuery(haystack: string, queryNorm: string): boolean {
  if (!queryNorm) return true;
  const hay = normalizeSearchText(haystack);
  if (!hay) return false;
  if (hay.includes(queryNorm)) return true;
  const hayCompact = hay.replace(/\s/g, "");
  const qCompact = queryNorm.replace(/\s/g, "");
  if (qCompact.length > 0 && hayCompact.includes(qCompact)) return true;
  const tokens = queryNorm.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length > 1) {
    return tokens.some((t) => hay.includes(t) || hayCompact.includes(t.replace(/\s/g, "")));
  }
  return false;
}

/** Kỳ mới nhất đã xong thu/giao — hiển thị tích xanh ở danh sách dây. */
function lineCycleComplete(line: TheoDoiLinePayload): boolean {
  return line.latestOpening?.status === "DA_GIAO_TIEN";
}

function compareLineName(a: TheoDoiLinePayload, b: TheoDoiLinePayload) {
  return a.lineName.localeCompare(b.lineName, "vi", { sensitivity: "base" });
}

/** Ngưỡng: từ đây trở lên, nhóm "Đã xong" mặc định thu gọn để không kéo dài cả trang. */
const DONE_SECTION_AUTO_COLLAPSE = 10;

function GreenCheckIcon() {
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
      title="Dây này đã thu đủ / đã giao tiền cho kỳ hiện tại"
      aria-label="Đã thu đủ kỳ này"
    >
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path
          d="M2.5 6l2.5 2.5L9.5 3.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function TheoDoiPanel({ initialLines }: { initialLines: TheoDoiLinePayload[] }) {
  const router = useRouter();
  const [lines, setLines] = useState(initialLines);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLineId, setSelectedLineId] = useState<string | null>(() => initialLines[0]?.lineId ?? null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  /** Khi có nhiều dây đã xong, ẩn bớt trong sidebar; vẫn chọn được từng dây nếu mở rộng. */
  const [doneSectionOpen, setDoneSectionOpen] = useState(true);

  const visibleLines = useMemo(() => {
    const q = normalizeSearchText(searchQuery);
    const qDigits = q.replace(/\D/g, "");
    if (!q) return lines;
    return lines
      .map((line) => {
        const lineHit = haystackMatchesQuery(line.lineName, q);
        const groups = lineHit
          ? line.groups
          : line.groups.filter((g) => {
              const phoneNorm = g.memberPhone.replace(/\D/g, "");
              return (
                haystackMatchesQuery(g.memberName, q) ||
                haystackMatchesQuery(g.memberPhone, q) ||
                (qDigits.length > 0 && phoneNorm.includes(qDigits))
              );
            });
        return { ...line, groups };
      })
      .filter((line) => line.groups.length > 0 || haystackMatchesQuery(line.lineName, q));
  }, [lines, searchQuery]);

  const pendingLines = useMemo(() => {
    const p = visibleLines.filter((l) => !lineCycleComplete(l));
    p.sort(compareLineName);
    return p;
  }, [visibleLines]);

  const completedLines = useMemo(() => {
    const c = visibleLines.filter((l) => lineCycleComplete(l));
    c.sort(compareLineName);
    return c;
  }, [visibleLines]);

  useEffect(() => {
    const doneN = completedLines.length;
    if (pendingLines.length === 0) {
      setDoneSectionOpen(true);
      return;
    }
    if (doneN > DONE_SECTION_AUTO_COLLAPSE) {
      setDoneSectionOpen(false);
    } else {
      setDoneSectionOpen(true);
    }
  }, [completedLines.length, pendingLines.length]);

  const sortedVisibleLines = useMemo(
    () => [...pendingLines, ...completedLines],
    [pendingLines, completedLines],
  );

  useEffect(() => {
    if (sortedVisibleLines.length === 0) return;
    if (!selectedLineId || !sortedVisibleLines.some((l) => l.lineId === selectedLineId)) {
      setSelectedLineId(sortedVisibleLines[0].lineId);
    }
  }, [sortedVisibleLines, selectedLineId]);

  const activeLine = useMemo(() => {
    if (sortedVisibleLines.length === 0) return null;
    return sortedVisibleLines.find((l) => l.lineId === selectedLineId) ?? sortedVisibleLines[0];
  }, [sortedVisibleLines, selectedLineId]);

  function selectLine(lineId: string) {
    setSelectedLineId(lineId);
    const line = visibleLines.find((l) => l.lineId === lineId);
    if (line && lineCycleComplete(line)) {
      setDoneSectionOpen(true);
    }
  }

  async function togglePaid(line: TheoDoiLinePayload, memberKey: string, next: boolean) {
    const openingId = line.latestOpening?.id;
    if (!openingId) return;
    const key = `${openingId}:${memberKey}`;
    setBusyKey(key);
    setError("");
    setLines((prev) =>
      prev.map((l) =>
        l.lineId !== line.lineId
          ? l
          : {
              ...l,
              paidByMemberKey: { ...l.paidByMemberKey, [memberKey]: next },
            },
      ),
    );
    try {
      const res = await fetch("/api/theo-doi/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ huiOpeningId: openingId, memberKey, paidFull: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không lưu được");
        setLines((prev) =>
          prev.map((l) =>
            l.lineId !== line.lineId
              ? l
              : {
                  ...l,
                  paidByMemberKey: { ...l.paidByMemberKey, [memberKey]: !next },
                },
          ),
        );
      } else if (data.openingAutoCompleted && line.latestOpening && typeof data.openingStatus === "string") {
        setLines((prev) =>
          prev.map((l) =>
            l.lineId !== line.lineId || !l.latestOpening || l.latestOpening.id !== openingId
              ? l
              : {
                  ...l,
                  latestOpening: { ...l.latestOpening, status: data.openingStatus },
                },
          ),
        );
        router.refresh();
      }
    } catch {
      setError("Không thể kết nối máy chủ");
      setLines((prev) =>
        prev.map((l) =>
          l.lineId !== line.lineId
            ? l
            : {
                ...l,
                paidByMemberKey: { ...l.paidByMemberKey, [memberKey]: !next },
              },
        ),
      );
    } finally {
      setBusyKey(null);
    }
  }

  const pendingCount = useMemo(
    () => visibleLines.filter((l) => !lineCycleComplete(l) && l.latestOpening).length,
    [visibleLines],
  );

  const needsAttentionCount = useMemo(
    () => visibleLines.filter((l) => !lineCycleComplete(l)).length,
    [visibleLines],
  );

  return (
    <section className="min-h-[calc(100vh-140px)] w-full min-w-0 max-w-full rounded-2xl border border-slate-300 bg-white p-3 shadow-sm sm:p-5">
      <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-900">Theo dõi đóng tiền</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
            Chọn <span className="font-semibold">một dây hụi</span> trong danh sách bên trái để xem và đánh dấu hụi
            viên theo <span className="font-semibold">kỳ khui mới nhất</span>. Dây đã thu đủ / giao tiền có{" "}
            <span className="font-semibold text-emerald-700">tích xanh</span>. Khi có rất nhiều dây: danh sách{" "}
            <span className="font-semibold">cuộn dọc</span>, phần <span className="font-semibold">chưa xong</span> luôn
            ở trên; dùng ô tìm kiếm để lọc theo tên dây hoặc hụi viên.
          </p>
        </div>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm theo tên dây, tên hoặc SĐT hụi viên…"
          className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 lg:mt-0 lg:max-w-xs"
          aria-label="Tìm trong theo dõi"
        />
      </div>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

      {visibleLines.length === 0 ? (
        <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          {lines.length === 0 ? "Chưa có dây hụi nào." : "Không có dây hoặc hụi viên khớp tìm kiếm."}
        </p>
      ) : (
        <div className="mt-5 flex min-h-[min(70vh,640px)] w-full min-w-0 flex-col gap-4 lg:min-h-[calc(100vh-12rem)] lg:flex-row lg:gap-0 lg:rounded-xl lg:border lg:border-slate-300 lg:shadow-sm">
          <aside className="flex max-h-[min(52vh,480px)] w-full min-w-0 flex-col rounded-xl border border-slate-300 bg-slate-50/80 lg:max-h-none lg:h-full lg:min-h-0 lg:w-[min(100%,300px)] lg:shrink-0 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-300 lg:bg-slate-50">
            <div className="sticky top-0 z-10 shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dây hụi</p>
              <p className="mt-0.5 text-xs text-slate-600">
                {visibleLines.length} dây
                {needsAttentionCount > 0 ? (
                  <span className="text-amber-800"> · {needsAttentionCount} cần làm</span>
                ) : null}
                {pendingCount > 0 && pendingCount !== needsAttentionCount ? (
                  <span className="text-slate-500"> · {pendingCount} đang có kỳ chưa xong</span>
                ) : null}
              </p>
            </div>
            <ul
              className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-2 [scrollbar-gutter:stable]"
              role="listbox"
              aria-label="Danh sách dây hụi"
            >
              {pendingLines.length > 0 ? (
                <li className="px-2 pb-1 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-900/80">
                    Chưa xong ({pendingLines.length})
                  </p>
                </li>
              ) : null}
              {pendingLines.map((line) => {
                const selected = line.lineId === activeLine?.lineId;
                const hasOpening = Boolean(line.latestOpening);
                return (
                  <li key={line.lineId}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => selectLine(line.lineId)}
                      className={`flex w-full items-center gap-2 rounded-lg py-2.5 pl-2 pr-2.5 text-left text-sm transition-colors ${
                        selected
                          ? "border-l-[3px] border-l-blue-600 bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200"
                          : "border-l-[3px] border-l-transparent text-slate-700 hover:bg-white/90"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate" title={line.lineName}>
                        {line.lineName}
                      </span>
                      {hasOpening ? (
                        <span
                          className="h-5 w-5 shrink-0 rounded-full border border-slate-300 bg-white"
                          title="Kỳ này chưa xác nhận đủ / chưa giao tiền"
                          aria-hidden
                        />
                      ) : (
                        <span
                          className="h-5 w-5 shrink-0 rounded-full border border-dashed border-slate-300 bg-slate-100"
                          title="Chưa có kỳ khui"
                          aria-hidden
                        />
                      )}
                    </button>
                  </li>
                );
              })}

              {completedLines.length > 0 ? (
                <>
                  <li className="px-2 pb-1 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-900/80">
                        Đã xong ({completedLines.length})
                      </p>
                      {completedLines.length > DONE_SECTION_AUTO_COLLAPSE ? (
                        <button
                          type="button"
                          onClick={() => setDoneSectionOpen((o) => !o)}
                          className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          {doneSectionOpen ? "Thu gọn" : "Mở rộng"}
                        </button>
                      ) : null}
                    </div>
                  </li>
                  {(() => {
                    const showAll =
                      doneSectionOpen || completedLines.length <= DONE_SECTION_AUTO_COLLAPSE;
                    const pinned =
                      !showAll &&
                      activeLine &&
                      lineCycleComplete(activeLine) &&
                      completedLines.some((l) => l.lineId === activeLine.lineId)
                        ? activeLine
                        : null;
                    const linesToRender = showAll
                      ? completedLines
                      : pinned
                        ? [pinned]
                        : [];
                    return (
                      <>
                        {linesToRender.map((line) => {
                          const selected = line.lineId === activeLine?.lineId;
                          return (
                            <li key={line.lineId}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => selectLine(line.lineId)}
                                className={`flex w-full items-center gap-2 rounded-lg py-2.5 pl-2 pr-2.5 text-left text-sm transition-colors ${
                                  selected
                                    ? "border-l-[3px] border-l-blue-600 bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200"
                                    : "border-l-[3px] border-l-transparent text-slate-700 hover:bg-white/90"
                                }`}
                              >
                                <span className="min-w-0 flex-1 truncate" title={line.lineName}>
                                  {line.lineName}
                                </span>
                                <GreenCheckIcon />
                              </button>
                            </li>
                          );
                        })}
                        {!showAll && completedLines.length > DONE_SECTION_AUTO_COLLAPSE ? (
                          <li className="px-2 py-1">
                            <button
                              type="button"
                              onClick={() => setDoneSectionOpen(true)}
                              className="w-full rounded-lg border border-dashed border-slate-300 bg-white/60 py-2 text-center text-xs font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-800"
                            >
                              Hiện cả {completedLines.length} dây đã xong…
                            </button>
                          </li>
                        ) : null}
                      </>
                    );
                  })()}
                </>
              ) : null}
            </ul>
          </aside>

          <div className="min-w-0 w-full flex-1 overflow-hidden rounded-xl border border-slate-300 bg-white lg:rounded-none lg:border-0">
            {activeLine ? (
              <article className="flex h-full min-h-[320px] min-w-0 flex-col">
                <div className="flex flex-col gap-1 border-b border-slate-200 bg-slate-50/90 px-3 py-3 sm:px-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-slate-900">{activeLine.lineName}</h3>
                    <p className="text-xs leading-relaxed text-slate-600">
                      <span>
                        Mức hụi {formatMoneyVN(activeLine.mucHuiThang)} · {activeLine.soChan} chân
                      </span>
                      <span className="text-slate-400"> · </span>
                      <span title="Giá thăm kỳ khui mới nhất">
                        Giá thăm{" "}
                        {activeLine.giaThamKyNay != null ? (
                          <span className="font-semibold text-slate-800">
                            {formatMoneyVN(activeLine.giaThamKyNay)}
                          </span>
                        ) : (
                          <span className="font-normal text-slate-500">—</span>
                        )}
                      </span>
                      <span className="text-slate-400"> · </span>
                      <span title="Tiền cò mỗi chân mỗi kỳ (theo dây)">
                        Tiền cò{" "}
                        <span className="font-semibold text-slate-800">{formatMoneyVN(activeLine.tienCo)}</span>
                      </span>
                    </p>
                  </div>
                  {activeLine.latestOpening ? (
                    <p className="text-sm font-semibold text-slate-800">
                      Kỳ {activeLine.latestOpening.kyThu} · Ngày hốt{" "}
                      {formatDateDisplay(activeLine.latestOpening.ngayKhui)}
                      <span className="ml-2 font-normal text-slate-600">
                        ({openingStatusLabel(activeLine.latestOpening.status)})
                      </span>
                    </p>
                  ) : (
                    <p className="shrink-0 text-sm font-medium text-amber-800 sm:max-w-sm">
                      Chưa có kỳ khui — chưa đánh dấu được.
                    </p>
                  )}
                </div>

                <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
                  <table className="w-full min-w-[640px] table-fixed text-center text-sm sm:min-w-[680px]">
                    <thead className="bg-white text-slate-700">
                      <tr className="border-b border-slate-300">
                        <th className="w-14 border-r border-slate-300 px-2 py-2 font-bold">STT</th>
                        <th className="border-r border-slate-300 px-2 py-2 font-bold">Họ tên</th>
                        <th className="w-36 border-r border-slate-300 px-2 py-2 font-bold">SĐT</th>
                        <th className="w-24 border-r border-slate-300 px-2 py-2 font-bold">Số chân</th>
                        <th className="border-r border-slate-300 px-2 py-2 font-bold">Chân (STT)</th>
                        <th
                          className="w-36 border-r border-slate-300 px-2 py-2 font-bold"
                          title="Tiền đóng kỳ hiện tại: chân sống × mức góp kỳ + chân chết × mức dây (người hốt kỳ này: trừ ngang)"
                        >
                          Số tiền
                        </th>
                        <th className="w-40 px-2 py-2 font-bold">Đã đóng đủ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 text-[15px] font-medium text-slate-700">
                      {activeLine.groups.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-5 text-slate-500">
                            Chưa gán hụi viên vào chân.
                          </td>
                        </tr>
                      ) : (
                        activeLine.groups.map((g, idx) => {
                          const openingId = activeLine.latestOpening?.id;
                          const checked = openingId ? (activeLine.paidByMemberKey[g.memberKey] ?? false) : false;
                          const busy = busyKey === `${openingId}:${g.memberKey}`;
                          return (
                            <tr key={g.memberKey} className="bg-white hover:bg-slate-50/80">
                              <td className="border-r border-slate-300 px-2 py-2 tabular-nums">{idx + 1}</td>
                              <td className="border-r border-slate-300 px-2 py-2 text-left">{g.memberName}</td>
                              <td className="border-r border-slate-300 px-2 py-2 tabular-nums">{g.memberPhone}</td>
                              <td className="border-r border-slate-300 px-2 py-2 tabular-nums">{g.slotCount}</td>
                              <td className="border-r border-slate-300 px-2 py-2 text-sm tabular-nums">
                                {g.legStts.join(", ")}
                              </td>
                              <td className="border-r border-slate-300 px-2 py-2 text-sm font-semibold tabular-nums">
                                {g.tienDongKyNay == null ? (
                                  <span className="font-normal text-slate-500">—</span>
                                ) : g.laNguoiHotKyNay ? (
                                  <span
                                    className="text-slate-600"
                                    title="Đã hốt kỳ này — bù trừ với tiền chủ giao, không thu đóng riêng"
                                  >
                                    Hốt hụi
                                  </span>
                                ) : (
                                  <span className="text-emerald-800">{formatMoneyVN(g.tienDongKyNay)}</span>
                                )}
                              </td>
                              <td className="px-2 py-2">
                                {g.laNguoiHotKyNay ? (
                                  <span
                                    className={`text-xs font-semibold ${
                                      activeLine.latestOpening?.status === "DA_GIAO_TIEN"
                                        ? "text-emerald-800"
                                        : "text-amber-800"
                                    }`}
                                  >
                                    {activeLine.latestOpening?.status === "DA_GIAO_TIEN" ? "Đã giao" : "Chờ giao"}
                                  </span>
                                ) : (
                                  <label className="inline-flex cursor-pointer items-center justify-center gap-2">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
                                      checked={checked}
                                      disabled={!openingId || busy}
                                      onChange={(e) => void togglePaid(activeLine, g.memberKey, e.target.checked)}
                                    />
                                    <span className="text-xs font-semibold text-slate-700">
                                      {checked ? "Đã đóng đủ" : "Chưa"}
                                    </span>
                                  </label>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
