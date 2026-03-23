"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getClientCache, setClientCache } from "@/lib/client-query-cache";

type DayHui = {
  id: string;
  name: string;
  soChan: number;
  mucHuiThang: string;
  tienCo: string | null;
  chuKy: "NGAY" | "THANG" | "NAM";
  ngayMo: string;
  status: "DANG_CHAY" | "SAP_MO" | "CHO_GOP";
  hasOpened?: boolean;
  openingCount?: number;
};

type HuiLeg = {
  id: string;
  stt: number;
  memberName: string | null;
  memberPhone: string | null;
  note: string | null;
};

type HuiMember = {
  id: string;
  name: string;
  phone: string;
};

type AssignedGroup = {
  key: string;
  memberName: string;
  memberPhone: string;
  legs: HuiLeg[];
};

type LineFormField = "name" | "soChan" | "mucHuiThang" | "ngayMo" | "tienCo";

function parseMoneyToDecimalLocal(input: string) {
  const normalized = input.replace(/[^\d.-]/g, "");
  if (!normalized) return null;
  const numeric = Number(normalized);
  if (Number.isNaN(numeric)) return null;
  return numeric.toFixed(2);
}

function parseNgayMoLocal(value: string) {
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export default function DayHuiPanel() {
  const router = useRouter();
  const [lines, setLines] = useState<DayHui[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [soChan, setSoChan] = useState("");
  const [mucHuiThang, setMucHuiThang] = useState("");
  const [tienCo, setTienCo] = useState("");
  const [chuKy, setChuKy] = useState<DayHui["chuKy"]>("THANG");
  const [ngayMo, setNgayMo] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<LineFormField, string>>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openChanLineId, setOpenChanLineId] = useState<string | null>(null);
  const [loadingChanLineId, setLoadingChanLineId] = useState<string | null>(null);
  const [assigningMemberId, setAssigningMemberId] = useState<string | null>(null);
  const [legsByLine, setLegsByLine] = useState<Record<string, HuiLeg[]>>({});
  const [members, setMembers] = useState<HuiMember[]>([]);
  const [chanSelectedMemberId, setChanSelectedMemberId] = useState("");
  const [chanSlotCount, setChanSlotCount] = useState("");
  const [savingLegId, setSavingLegId] = useState<string | null>(null);
  const [deletingLegId, setDeletingLegId] = useState<string | null>(null);
  const [lineSearch, setLineSearch] = useState("");

  const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  function parseMemberIdFromNote(note: string | null) {
    if (!note) return null;
    if (!note.startsWith("memberId:")) return null;
    return note.slice("memberId:".length) || null;
  }

  function getAvailableMembers(lineId: string) {
    const lineLegs = legsByLine[lineId] ?? [];
    const assignedIds = new Set(
      lineLegs.map((leg) => parseMemberIdFromNote(leg.note)).filter((value): value is string => Boolean(value)),
    );
    return members.filter((member) => !assignedIds.has(member.id));
  }

  function getAssignedGroups(lineId: string) {
    const groups = new Map<string, AssignedGroup>();
    for (const leg of legsByLine[lineId] ?? []) {
      if (!leg.memberName) continue;
      const key = `${leg.memberName}__${leg.memberPhone ?? ""}`;
      const current = groups.get(key);
      if (current) {
        current.legs.push(leg);
      } else {
        groups.set(key, {
          key,
          memberName: leg.memberName,
          memberPhone: leg.memberPhone ?? "",
          legs: [leg],
        });
      }
    }
    return Array.from(groups.values());
  }

  useEffect(() => {
    async function loadLines() {
      const cached = getClientCache<DayHui[]>("day-hui:lines");
      if (cached) {
        setLines(cached);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/day-hui");
        const data = await res.json();
        if (!res.ok) {
          setError(data.message ?? "Không tải được dữ liệu dây hụi");
          return;
        }

        const nextLines = (data.lines ?? []).map(
          (line: {
            id: string;
            name: string;
            soChan: number;
            mucHuiThang: string;
            tienCo: string | null;
            chuKy: "NGAY" | "THANG" | "NAM";
            ngayMo: string;
            status: "DANG_CHAY" | "SAP_MO" | "CHO_GOP";
            hasOpened?: boolean;
            openingCount?: number;
          }) => ({
            ...line,
            ngayMo: formatDateDisplay(new Date(line.ngayMo)),
          }),
        );
        setLines(nextLines);
        // Cache ngắn để tránh refetch mỗi lần đổi tab rồi quay lại.
        setClientCache("day-hui:lines", nextLines, 20_000);
      } catch {
        setError("Không thể kết nối máy chủ");
      } finally {
        setLoading(false);
      }
    }

    void loadLines();
  }, []);

  useEffect(() => {
    // Đồng bộ cache cục bộ sau mọi thao tác tạo/sửa/xóa để quay lại tab không bị dữ liệu cũ.
    setClientCache("day-hui:lines", lines, 20_000);
  }, [lines]);

  function formatDateDisplay(date: Date) {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  function buildCalendarDays(monthDate: Date) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells: Array<{ day: number; date: Date | null }> = [];

    for (let i = 0; i < startOffset; i += 1) cells.push({ day: 0, date: null });
    for (let day = 1; day <= daysInMonth; day += 1) cells.push({ day, date: new Date(year, month, day) });
    while (cells.length % 7 !== 0) cells.push({ day: 0, date: null });

    return cells;
  }

  function formatMoneyVN(value: string | null) {
    if (value == null || value === "") return "0đ";
    const n = Number(value);
    if (Number.isNaN(n)) return value;
    return `${n.toLocaleString("vi-VN")}đ`;
  }

  function validateLineForm(): Partial<Record<LineFormField, string>> {
    const next: Partial<Record<LineFormField, string>> = {};
    const nameTrim = name.trim();
    if (!nameTrim) next.name = "Vui lòng nhập tên dây hụi";
    else if (nameTrim.length < 2) next.name = "Tên dây hụi phải từ 2 ký tự";

    if (!soChan.trim()) next.soChan = "Vui lòng nhập số chân";
    else {
      const n = Number(soChan);
      if (!Number.isInteger(n) || n < 1) next.soChan = "Số chân phải là số nguyên từ 1 trở lên";
    }

    const mucTrim = mucHuiThang.trim();
    if (!mucTrim) next.mucHuiThang = "Vui lòng nhập mức hụi/tháng";
    else {
      const dec = parseMoneyToDecimalLocal(mucTrim);
      if (!dec || Number(dec) <= 0) next.mucHuiThang = "Mức hụi phải là số tiền hợp lệ, lớn hơn 0";
    }

    const ngayTrim = ngayMo.trim();
    if (!ngayTrim) next.ngayMo = "Vui lòng chọn ngày mở trên lịch";
    else if (!parseNgayMoLocal(ngayTrim)) next.ngayMo = "Ngày mở không hợp lệ (định dạng dd/mm/yyyy)";

    const coTrim = tienCo.trim();
    if (!coTrim) next.tienCo = "Vui lòng nhập tiền cò (có thể nhập 0 nếu không lấy cò)";
    else {
      const dec = parseMoneyToDecimalLocal(coTrim);
      if (!dec) next.tienCo = "Tiền cò không hợp lệ";
      else if (Number(dec) < 0) next.tienCo = "Tiền cò không được âm";
    }

    return next;
  }

  function fieldInputClass(field: LineFormField) {
    return fieldErrors[field]
      ? "rounded-xl border border-rose-400 bg-white px-3 py-2 outline-none focus:border-rose-500"
      : "rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400";
  }

  function formatStatus(line: DayHui) {
    if (line.hasOpened) {
      const opened = line.openingCount ?? 0;
      return `Đang mở kỳ ${opened}/${line.soChan}`;
    }
    return "Đang chờ";
  }

  function formatChuKy(chuKyValue: DayHui["chuKy"]) {
    if (chuKyValue === "NGAY") return "Ngày";
    if (chuKyValue === "NAM") return "Năm";
    return "Tháng";
  }

  const lineQuery = lineSearch.trim().toLowerCase();
  const linesMatchingSearch = !lineQuery
    ? lines
    : lines.filter((line) => {
        const blob = [
          line.name,
          String(line.soChan),
          formatMoneyVN(line.mucHuiThang),
          line.mucHuiThang,
          line.ngayMo,
          formatChuKy(line.chuKy),
          formatStatus(line),
        ]
          .join(" ")
          .toLowerCase();
        return blob.includes(lineQuery);
      });

  const displayLines = openChanLineId
    ? lines.filter((line) => line.id === openChanLineId)
    : linesMatchingSearch;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validation = validateLineForm();
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation);
      setError("Vui lòng nhập đủ và kiểm tra lại các trường được đánh dấu.");
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    setError("");

    try {
      const endpoint = editingId ? `/api/day-hui/${editingId}` : "/api/day-hui";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          soChan: Number(soChan),
          mucHuiThang: mucHuiThang.trim(),
          tienCo: tienCo.trim(),
          chuKy,
          ngayMo: ngayMo.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể thêm dây hụi");
        return;
      }

      if (editingId) {
        setLines((prev) =>
          prev.map((line) =>
            line.id === editingId
              ? {
                  ...line,
                  name: name.trim(),
                  soChan: Number(soChan),
                  mucHuiThang: mucHuiThang.trim(),
                  tienCo: tienCo.trim(),
                  chuKy,
                  ngayMo: ngayMo.trim(),
                }
              : line,
          ),
        );
      } else {
        const created = data.line as DayHui;
        setLines((prev) => [
          ...prev,
          {
            ...created,
            ngayMo: formatDateDisplay(new Date(created.ngayMo)),
          },
        ]);
      }

      setName("");
      setSoChan("");
      setMucHuiThang("");
      setTienCo("");
      setChuKy("THANG");
      setNgayMo("");
      setEditingId(null);
      setShowForm(false);
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(line: DayHui) {
    if (line.hasOpened) {
      setError("Dây hụi đã khui, không thể chỉnh sửa.");
      return;
    }
    setFieldErrors({});
    setError("");
    setEditingId(line.id);
    setName(line.name);
    setSoChan(String(line.soChan));
    setMucHuiThang(line.mucHuiThang);
    setTienCo(line.tienCo ?? "");
    setChuKy(line.chuKy);
    setNgayMo(line.ngayMo);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    const target = lines.find((line) => line.id === id);
    if (target?.hasOpened) {
      setError("Dây hụi đã khui, không thể xóa.");
      return;
    }
    const confirmed = window.confirm("Bạn có chắc muốn xóa dây hụi này không?");
    if (!confirmed) return;

    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/day-hui/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể xóa dây hụi");
        return;
      }
      setLines((prev) => prev.filter((line) => line.id !== id));
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleChan(lineId: string) {
    if (openChanLineId === lineId) {
      setOpenChanLineId(null);
      return;
    }
    setLoadingChanLineId(lineId);
    setError("");
    try {
      const [chanRes, membersRes] = await Promise.all([
        fetch(`/api/day-hui/${lineId}/chan`),
        fetch("/api/hui-vien"),
      ]);
      const chanData = await chanRes.json();
      const membersData = await membersRes.json();

      if (!chanRes.ok) {
        setError(chanData.message ?? "Không tải được danh sách chân");
        return;
      }
      if (!membersRes.ok) {
        setError(membersData.message ?? "Không tải được danh sách hụi viên");
        return;
      }

      const lineLegs = (chanData.legs ?? []) as HuiLeg[];
      const fetchedMembers = (membersData.members ?? []) as HuiMember[];
      setLegsByLine((prev) => ({ ...prev, [lineId]: lineLegs }));
      setMembers(fetchedMembers);
      const assignedIds = new Set(
        lineLegs.map((leg) => parseMemberIdFromNote(leg.note)).filter((value): value is string => Boolean(value)),
      );
      const firstAvailable = fetchedMembers.find((member) => !assignedIds.has(member.id));
      setChanSelectedMemberId(firstAvailable?.id ?? "");
      setChanSlotCount("");
      setOpenChanLineId(lineId);
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setLoadingChanLineId(null);
    }
  }

  async function handleAssignMember(lineId: string) {
    const availableMembers = getAvailableMembers(lineId);
    const memberId = availableMembers.some((member) => member.id === chanSelectedMemberId)
      ? chanSelectedMemberId
      : (availableMembers[0]?.id ?? "");

    if (!memberId) {
      setError("Vui lòng chọn hụi viên");
      return;
    }

    const slotCount = Number(chanSlotCount || "0");
    if (!Number.isInteger(slotCount) || slotCount <= 0) {
      setError("Vui lòng chọn số chân hợp lệ");
      return;
    }

    setAssigningMemberId(memberId);
    setError("");
    try {
      const res = await fetch(`/api/day-hui/${lineId}/chan/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          slotCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể xác nhận chân");
        return;
      }

      const refresh = await fetch(`/api/day-hui/${lineId}/chan`);
      const refreshData = await refresh.json();
      if (refresh.ok) {
        const nextLegs = (refreshData.legs ?? []) as HuiLeg[];
        setLegsByLine((prev) => ({ ...prev, [lineId]: nextLegs }));
        const assignedIds = new Set(
          nextLegs.map((leg) => parseMemberIdFromNote(leg.note)).filter((value): value is string => Boolean(value)),
        );
        const firstAvailable = members.find((member) => !assignedIds.has(member.id));
        setChanSelectedMemberId(firstAvailable?.id ?? "");
      }
      setChanSlotCount("");
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setAssigningMemberId(null);
    }
  }

  async function refreshLineLegs(lineId: string) {
    const refresh = await fetch(`/api/day-hui/${lineId}/chan`);
    const refreshData = await refresh.json();
    if (refresh.ok) {
      const nextLegs = (refreshData.legs ?? []) as HuiLeg[];
      setLegsByLine((prev) => ({ ...prev, [lineId]: nextLegs }));
      const assignedIds = new Set(
        nextLegs.map((leg) => parseMemberIdFromNote(leg.note)).filter((value): value is string => Boolean(value)),
      );
      const firstAvailable = members.find((member) => !assignedIds.has(member.id));
      setChanSelectedMemberId(firstAvailable?.id ?? "");
    }
  }

  async function handleEditGroup(lineId: string, group: AssignedGroup) {
    const nextName = window.prompt("Nhập họ tên mới:", group.memberName);
    if (!nextName?.trim()) return;
    const nextPhone = window.prompt("Nhập số điện thoại mới:", group.memberPhone) ?? "";

    setSavingLegId(group.key);
    setError("");
    try {
      await Promise.all(
        group.legs.map((leg) =>
          fetch(`/api/day-hui/${lineId}/chan/${leg.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberName: nextName.trim(),
              memberPhone: nextPhone.trim(),
              note: leg.note ?? "",
            }),
          }),
        ),
      );
      await refreshLineLegs(lineId);
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setSavingLegId(null);
    }
  }

  async function handleDeleteGroup(lineId: string, group: AssignedGroup) {
    const ok = window.confirm(`Xóa ${group.memberName} khỏi ${group.legs.length} chân?`);
    if (!ok) return;
    setDeletingLegId(group.key);
    setError("");
    try {
      await Promise.all(
        group.legs.map((leg) =>
          fetch(`/api/day-hui/${lineId}/chan/${leg.id}`, {
            method: "DELETE",
          }),
        ),
      );
      await refreshLineLegs(lineId);
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setDeletingLegId(null);
    }
  }

  async function handleKhui(lineId: string) {
    router.push(`/day-hui/${lineId}/khui`);
  }

  return (
    <article className="min-h-[calc(100vh-140px)] rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="shrink-0 text-xl font-semibold text-slate-900">Quản lý dây hụi</h2>
        <div className="order-last flex w-full min-w-0 flex-1 justify-center sm:order-none sm:max-w-md sm:px-2">
          <input
            type="search"
            value={lineSearch}
            onChange={(e) => setLineSearch(e.target.value)}
            placeholder="Tìm theo tên dây, mức hụi, ngày mở…"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            aria-label="Tìm dây hụi"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => {
              const next = !v;
              if (next) {
                setFieldErrors({});
                setError("");
              }
              return next;
            });
          }}
          className="shrink-0 self-start rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white sm:self-auto"
        >
          {showForm ? "Đóng" : "Thêm dây hụi"}
        </button>
      </div>

      {showForm ? (
        <form onSubmit={onSubmit} className="mt-4 grid gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <input
              id="line-form-name"
              className={fieldInputClass("name")}
              placeholder="Tên dây hụi"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((p) => ({ ...p, name: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "line-form-name-hint" : undefined}
            />
            {fieldErrors.name ? (
              <p id="line-form-name-hint" className="text-xs text-rose-600">
                {fieldErrors.name}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <input
              id="line-form-soChan"
              className={fieldInputClass("soChan")}
              placeholder="Số chân"
              type="number"
              min={1}
              value={soChan}
              onChange={(e) => {
                setSoChan(e.target.value);
                setFieldErrors((p) => ({ ...p, soChan: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.soChan)}
              aria-describedby={fieldErrors.soChan ? "line-form-soChan-hint" : undefined}
            />
            {fieldErrors.soChan ? (
              <p id="line-form-soChan-hint" className="text-xs text-rose-600">
                {fieldErrors.soChan}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <input
              id="line-form-mucHui"
              className={fieldInputClass("mucHuiThang")}
              placeholder="Mức hụi / tháng (vd: 2000000)"
              value={mucHuiThang}
              onChange={(e) => {
                setMucHuiThang(e.target.value);
                setFieldErrors((p) => ({ ...p, mucHuiThang: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.mucHuiThang)}
              aria-describedby={fieldErrors.mucHuiThang ? "line-form-mucHui-hint" : undefined}
            />
            {fieldErrors.mucHuiThang ? (
              <p id="line-form-mucHui-hint" className="text-xs text-rose-600">
                {fieldErrors.mucHuiThang}
              </p>
            ) : null}
          </div>
          <div className="relative flex flex-col gap-1">
            <button
              type="button"
              id="line-form-ngayMo"
              onClick={() => setCalendarOpen((v) => !v)}
              className={
                fieldErrors.ngayMo
                  ? "flex w-full items-center justify-between rounded-xl border border-rose-400 bg-white px-3 py-2 text-left outline-none focus:border-rose-500"
                  : "flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-left outline-none focus:border-blue-400"
              }
              aria-invalid={Boolean(fieldErrors.ngayMo)}
              aria-describedby={fieldErrors.ngayMo ? "line-form-ngayMo-hint" : undefined}
            >
              <span>{ngayMo || "Ngày mở (chọn trên lịch)"}</span>
              <span className="ml-3 rounded-lg bg-blue-100 px-2 py-1 text-sm font-bold text-blue-700">📅</span>
            </button>

            {calendarOpen ? (
              <div className="absolute left-0 top-full z-20 mt-2 w-[360px] rounded-2xl border border-slate-300 bg-white p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
                  >
                    ←
                  </button>
                  <p className="text-base font-bold text-slate-900">
                    Tháng {viewMonth.getMonth() + 1}/{viewMonth.getFullYear()}
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
                  >
                    →
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-slate-600">
                  {weekdays.map((d) => (
                    <div key={d} className="py-2">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="mt-1 grid grid-cols-7 gap-2">
                  {buildCalendarDays(viewMonth).map((cell, idx) => {
                    if (!cell.date) return <div key={`empty-${idx}`} className="h-10 rounded-lg bg-slate-50" />;

                    const selected = ngayMo === formatDateDisplay(cell.date);
                    const today = new Date();
                    const isToday =
                      cell.date.getDate() === today.getDate() &&
                      cell.date.getMonth() === today.getMonth() &&
                      cell.date.getFullYear() === today.getFullYear();

                    return (
                      <button
                        key={cell.date.toISOString()}
                        type="button"
                        onClick={() => {
                          setNgayMo(formatDateDisplay(cell.date!));
                          setCalendarOpen(false);
                          setFieldErrors((p) => ({ ...p, ngayMo: undefined }));
                        }}
                        className={`h-10 rounded-lg text-sm font-semibold transition ${
                          selected
                            ? "bg-blue-600 text-white"
                            : isToday
                              ? "border-2 border-blue-500 bg-blue-50 text-blue-700"
                              : "border border-slate-300 bg-white text-slate-700 hover:bg-blue-50"
                        }`}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {fieldErrors.ngayMo ? (
              <p id="line-form-ngayMo-hint" className="text-xs text-rose-600">
                {fieldErrors.ngayMo}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <input
              id="line-form-tienCo"
              className={fieldInputClass("tienCo")}
              placeholder="Tiền cò (vd: 500000, hoặc 0)"
              value={tienCo}
              onChange={(e) => {
                setTienCo(e.target.value);
                setFieldErrors((p) => ({ ...p, tienCo: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.tienCo)}
              aria-describedby={fieldErrors.tienCo ? "line-form-tienCo-hint" : undefined}
            />
            {fieldErrors.tienCo ? (
              <p id="line-form-tienCo-hint" className="text-xs text-rose-600">
                {fieldErrors.tienCo}
              </p>
            ) : null}
          </div>
          <select
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
            value={chuKy}
            onChange={(e) => setChuKy(e.target.value as DayHui["chuKy"])}
          >
            <option value="NGAY">Chu kỳ: Ngày</option>
            <option value="THANG">Chu kỳ: Tháng</option>
            <option value="NAM">Chu kỳ: Năm</option>
          </select>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Đang lưu..." : editingId ? "Cập nhật dây hụi" : "Lưu dây hụi"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFieldErrors({});
                  setError("");
                  setName("");
                  setSoChan("");
                  setMucHuiThang("");
                  setTienCo("");
                  setChuKy("THANG");
                  setNgayMo("");
                  setShowForm(false);
                }}
                className="ml-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Hủy sửa
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-300">
        <div className="max-h-[420px] overflow-auto">
          <table className="min-w-full table-fixed text-center text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700">
              <tr className="border-b border-slate-300">
                <th className="w-16 border-r border-slate-300 px-3 py-3 font-bold">STT</th>
                <th className="border-r border-slate-300 px-3 py-3 font-bold">Tên dây hụi</th>
                <th className="w-24 border-r border-slate-300 px-3 py-3 font-bold">Số chân</th>
                <th className="border-r border-slate-300 px-3 py-3 font-bold">Mức Hụi</th>
                <th className="border-r border-slate-300 px-3 py-3 font-bold">Ngày mở</th>
                <th className="border-r border-slate-300 px-3 py-3 font-bold">Tiền cò</th>
                <th className="border-r border-slate-300 px-3 py-3 font-bold">Chu kỳ</th>
                <th className="border-r border-slate-300 px-3 py-3 font-bold">Hành động</th>
                <th className="w-28 px-3 py-3 font-bold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 bg-white">
              {!loading && lines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-slate-500">
                    Chưa có dây hụi nào.
                  </td>
                </tr>
              ) : null}
              {!loading && lines.length > 0 && !openChanLineId && linesMatchingSearch.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-slate-500">
                    Không có dây hụi khớp tìm kiếm.
                  </td>
                </tr>
              ) : null}
              {displayLines.map((line, index) => {
                const availableMembers = getAvailableMembers(line.id);
                const selectedMemberId = availableMembers.some((member) => member.id === chanSelectedMemberId)
                  ? chanSelectedMemberId
                  : (availableMembers[0]?.id ?? "");
                return (
                <Fragment key={line.id}>
                  <tr key={line.id} className="text-slate-700 transition hover:bg-slate-50">
                    <td className="border-r border-slate-300 px-3 py-3 font-semibold">{index + 1}</td>
                    <td className="border-r border-slate-300 px-3 py-3 text-left font-semibold">{line.name}</td>
                    <td className="border-r border-slate-300 px-3 py-3 font-semibold">{line.soChan}</td>
                    <td className="border-r border-slate-300 px-3 py-3 font-semibold">{formatMoneyVN(line.mucHuiThang)}</td>
                    <td className="border-r border-slate-300 px-3 py-3 font-semibold">{line.ngayMo}</td>
                    <td className="border-r border-slate-300 px-3 py-3 font-semibold">{formatMoneyVN(line.tienCo)}</td>
                    <td className="border-r border-slate-300 px-3 py-3 font-semibold">{formatChuKy(line.chuKy)}</td>
                    <td className="border-r border-slate-300 px-3 py-3">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleChan(line.id)}
                          disabled={loadingChanLineId === line.id}
                          className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-700 disabled:opacity-60"
                        >
                          {loadingChanLineId === line.id ? "Đang tải" : "Chân"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleKhui(line.id)}
                          disabled={loadingChanLineId === line.id}
                          className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                        >
                          {loadingChanLineId === line.id ? "Đang tải" : "Khui"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(line)}
                          disabled={line.hasOpened}
                          className="rounded-lg border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700 disabled:opacity-60"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(line.id)}
                          disabled={deletingId === line.id || line.hasOpened}
                          className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
                        >
                          {deletingId === line.id ? "Đang xóa" : "Xóa"}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-semibold">{formatStatus(line)}</td>
                  </tr>
                  {openChanLineId === line.id ? (
                    <tr className="bg-amber-50/50">
                      <td colSpan={9} className="px-3 py-3">
                        <div className="rounded-xl border border-amber-200 bg-white p-3">
                          <p className="mb-3 text-left text-sm font-semibold text-slate-800">
                            Danh sách chân của dây: {line.name}
                          </p>
                          <p className="mb-3 text-left text-sm text-slate-600">
                            Còn trống: {(legsByLine[line.id] ?? []).filter((l) => !l.memberName).length}/{line.soChan} chân
                          </p>
                          <div className="grid gap-3 rounded-xl border border-slate-300 bg-slate-50 p-3 md:grid-cols-[1fr_140px_auto] md:items-end">
                            <label className="grid gap-1">
                              <span className="text-sm font-medium text-slate-700">Hụi viên (cuộn danh sách)</span>
                              <select
                                value={selectedMemberId}
                                onChange={(e) => setChanSelectedMemberId(e.target.value)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
                              >
                                {availableMembers.map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.name} - {member.phone}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="grid gap-1">
                              <span className="text-sm font-medium text-slate-700">Số chân</span>
                              <input
                                type="number"
                                min={1}
                                value={chanSlotCount}
                                onChange={(e) => setChanSlotCount(e.target.value)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
                                placeholder="Nhập số chân"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => void handleAssignMember(line.id)}
                                disabled={!selectedMemberId || assigningMemberId === selectedMemberId}
                              className="h-10 rounded-lg border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-700 disabled:opacity-60"
                            >
                                {assigningMemberId === selectedMemberId ? "Đang xác nhận" : "Xác nhận"}
                            </button>
                          </div>

                          <div className="mt-4 overflow-auto rounded-xl border border-slate-300">
                            <table className="min-w-full table-fixed text-sm">
                              <thead className="bg-slate-50 text-slate-700">
                                <tr className="border-b border-slate-300">
                                  <th className="w-16 border-r border-slate-300 px-3 py-2 text-center">STT</th>
                                  <th className="border-r border-slate-300 px-3 py-2 text-center">Họ tên</th>
                                  <th className="w-44 border-r border-slate-300 px-3 py-2 text-center">SĐT</th>
                                  <th className="w-28 border-r border-slate-300 px-3 py-2 text-center">Số chân</th>
                                  <th className="w-48 border-r border-slate-300 px-3 py-2 text-center">Danh sách chân</th>
                                  <th className="w-36 px-3 py-2 text-center">Hành động</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-300 text-[15px] font-medium text-slate-700">
                                {getAssignedGroups(line.id).map((group, idx) => (
                                  <tr key={group.key} className="border-b border-slate-300">
                                    <td className="border-r border-slate-300 px-3 py-2 text-center">{idx + 1}</td>
                                    <td className="border-r border-slate-300 px-3 py-2 text-center">{group.memberName}</td>
                                    <td className="border-r border-slate-300 px-3 py-2 text-center">{group.memberPhone || "-"}</td>
                                    <td className="border-r border-slate-300 px-3 py-2 text-center">{group.legs.length} chân</td>
                                    <td className="border-r border-slate-300 px-3 py-2 text-center">
                                      {group.legs
                                        .map((leg) => String(leg.stt))
                                        .sort((a, b) => Number(a) - Number(b))
                                        .join(", ")}
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => void handleEditGroup(line.id, group)}
                                          disabled={savingLegId === group.key}
                                          className="rounded-lg border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700 disabled:opacity-60"
                                        >
                                          {savingLegId === group.key ? "Đang sửa" : "Sửa"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void handleDeleteGroup(line.id, group)}
                                          disabled={deletingLegId === group.key}
                                          className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
                                        >
                                          {deletingLegId === group.key ? "Đang xóa" : "Xóa"}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </article>
  );
}
