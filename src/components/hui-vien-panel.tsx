"use client";

import { useEffect, useMemo, useState } from "react";

type HuiVien = {
  id: string;
  name: string;
  phone: string;
  note: string;
};

export default function HuiVienPanel() {
  const PAGE_SIZE = 20;
  const [members, setMembers] = useState<HuiVien[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNote, setEditNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const query = searchQuery.trim().toLowerCase();
  const filteredMembers = useMemo(() => {
    if (!query) return members;
    return members.filter((m) => {
      const phoneNorm = m.phone.replace(/\D/g, "");
      const qDigits = query.replace(/\D/g, "");
      return (
        m.name.toLowerCase().includes(query) ||
        (qDigits.length > 0 && phoneNorm.includes(qDigits)) ||
        m.phone.toLowerCase().includes(query) ||
        (m.note && m.note !== "-" && m.note.toLowerCase().includes(query))
      );
    });
  }, [members, query]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageMembers = filteredMembers.slice(pageStart, pageStart + PAGE_SIZE);
  const emptyRows = Math.max(0, PAGE_SIZE - pageMembers.length);

  useEffect(() => {
    async function loadMembers() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/hui-vien");
        const data = await res.json();
        if (!res.ok) {
          setError(data.message ?? "Không tải được danh sách hụi viên");
          return;
        }
        setMembers(
          (data.members ?? []).map((m: { id: string; name: string; phone: string; note: string | null }) => ({
            id: m.id,
            name: m.name,
            phone: m.phone,
            note: m.note ?? "-",
          })),
        );
      } catch {
        setError("Không thể kết nối máy chủ");
      } finally {
        setLoading(false);
      }
    }

    void loadMembers();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/hui-vien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          note: note.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể thêm hụi viên");
        return;
      }

      const created = data.member as { id: string; name: string; phone: string; note: string | null };
      setMembers((prev) => [
        {
          id: created.id,
          name: created.name,
          phone: created.phone,
          note: created.note ?? "-",
        },
        ...prev,
      ]);

      setName("");
      setPhone("");
      setNote("");
      setShowForm(false);
      setCurrentPage(1);
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(member: HuiVien) {
    setEditingId(member.id);
    setEditName(member.name);
    setEditPhone(member.phone);
    setEditNote(member.note === "-" ? "" : member.note);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditPhone("");
    setEditNote("");
  }

  async function saveEdit(id: string) {
    if (!editName.trim() || !editPhone.trim()) return;
    setSavingEdit(true);
    setError("");
    try {
      const res = await fetch(`/api/hui-vien/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          note: editNote.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể cập nhật hụi viên");
        return;
      }

      const updated = data.member as { id: string; name: string; phone: string; note: string | null };
      setMembers((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                id: updated.id,
                name: updated.name,
                phone: updated.phone,
                note: updated.note ?? "-",
              }
            : m,
        ),
      );
      cancelEdit();
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteMember(id: string) {
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/hui-vien/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể xóa hụi viên");
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== id));
      if (editingId === id) {
        cancelEdit();
      }
      setCurrentPage((prev) => {
        const nextTotal = Math.max(1, Math.ceil((members.length - 1) / PAGE_SIZE));
        return Math.min(prev, nextTotal);
      });
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="min-h-[calc(100vh-140px)] rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="shrink-0 text-xl font-semibold text-slate-900">Danh sách hụi viên</h2>
        <div className="order-last flex w-full min-w-0 flex-1 justify-center sm:order-none sm:max-w-md sm:px-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, SĐT, ghi chú…"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            aria-label="Tìm hụi viên"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 self-start rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white sm:self-auto"
        >
          {showForm ? "Đóng" : "Thêm hụi viên"}
        </button>
      </div>

      {showForm ? (
        <form onSubmit={onSubmit} className="mt-4 grid gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4 md:grid-cols-3">
          <input
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
            placeholder="Họ tên"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
            placeholder="Số điện thoại"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <input
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
            placeholder="Ghi chú"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Đang lưu..." : "Lưu hụi viên"}
            </button>
          </div>
        </form>
      ) : null}
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-300">
        <div className="max-h-[420px] overflow-auto">
          <table className="min-w-full table-fixed text-center text-base">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700">
              <tr className="border-b border-slate-300">
                <th className="w-20 border-r border-slate-300 px-4 py-3 font-bold">STT</th>
                <th className="border-r border-slate-300 px-4 py-3 font-bold">Họ tên</th>
                <th className="border-r border-slate-300 px-4 py-3 font-bold">Số điện thoại</th>
                <th className="border-r border-slate-300 px-4 py-3 font-bold">Ghi chú</th>
                <th className="px-4 py-3 font-bold">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 bg-white text-[15px] font-medium text-slate-700">
            {!loading && members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-slate-500">
                  Chưa có hụi viên nào.
                </td>
              </tr>
            ) : null}
            {!loading && members.length > 0 && filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-slate-500">
                  Không có hụi viên khớp tìm kiếm.
                </td>
              </tr>
            ) : null}
            {filteredMembers.length > 0
              ? pageMembers.map((member, index) => (
              <tr key={member.id} className="text-slate-700 transition hover:bg-slate-50">
                <td className="border-r border-slate-300 px-4 py-3">{pageStart + index + 1}</td>
                <td className="border-r border-slate-300 px-4 py-3">
                  {editingId === member.id ? (
                    <input
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  ) : (
                    member.name
                  )}
                </td>
                <td className="border-r border-slate-300 px-4 py-3 tabular-nums">
                  {editingId === member.id ? (
                    <input
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                    />
                  ) : (
                    member.phone
                  )}
                </td>
                <td className="border-r border-slate-300 px-4 py-3 text-slate-700">
                  {editingId === member.id ? (
                    <input
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                    />
                  ) : (
                    member.note
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    {editingId === member.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void saveEdit(member.id)}
                          disabled={savingEdit}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {savingEdit ? "Đang lưu" : "Lưu"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          Hủy
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(member)}
                          className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteMember(member.id)}
                          disabled={deletingId === member.id}
                          className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                        >
                          {deletingId === member.id ? "Đang xóa" : "Xóa"}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
              : null}
            {filteredMembers.length > 0
              ? Array.from({ length: emptyRows }).map((_, idx) => (
              <tr key={`empty-${idx}`}>
                <td className="border-r border-slate-300 px-4 py-3">{pageStart + pageMembers.length + idx + 1}</td>
                <td className="border-r border-slate-300 px-4 py-3">-</td>
                <td className="border-r border-slate-300 px-4 py-3">-</td>
                <td className="border-r border-slate-300 px-4 py-3">-</td>
                <td className="px-4 py-3">-</td>
              </tr>
            ))
              : null}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
        <p>
          Trang {currentPage}/{totalPages} • Hiển thị {pageMembers.length} / {filteredMembers.length} hụi viên
          {query ? ` (lọc từ ${members.length})` : ""}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-50"
          >
            Trước
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      </div>
    </section>
  );
}
