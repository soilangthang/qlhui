"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import LogoutButton from "@/components/logout-button";
import { chuHuiTrialDaysRemaining } from "@/lib/chu-hui-trial";

export type QuanTriUser = {
  id: string;
  name: string;
  phone: string;
  rule: string;
  chuHuiAccessUnlocked: boolean;
  /** Số dây hụi (chủ hụi). */
  huiLineCount: number;
  /** Tổng tiền cò (VNĐ) trên các dây của chủ hụi. */
  tienCoTong: number;
  createdAt: string;
  updatedAt: string;
};

export type QuanTriStats = {
  chuHui: number;
  admin: number;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCount(n: number) {
  return n.toLocaleString("vi-VN");
}

function formatMoneyVn(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

export default function QuanTriPanel({
  currentAdminId,
  currentAdminName,
  users,
  stats,
}: {
  currentAdminId: string;
  currentAdminName: string;
  users: QuanTriUser[];
  stats: QuanTriStats;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<QuanTriUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRule, setEditRule] = useState<"user" | "admin">("user");
  const [resetting, setResetting] = useState<QuanTriUser | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetPwd2, setResetPwd2] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return users;
    return users.filter((u) => {
      if (u.name.toLowerCase().includes(q)) return true;
      if (u.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""))) return true;
      if (u.rule.toLowerCase().includes(q)) return true;
      if (String(u.huiLineCount).includes(q)) return true;
      if (formatMoneyVn(u.tienCoTong).toLowerCase().includes(q)) return true;
      return false;
    });
  }, [users, q]);

  function openEdit(u: QuanTriUser) {
    setEditing(u);
    setEditName(u.name);
    setEditPhone(u.phone);
    setEditRule(u.rule === "admin" ? "admin" : "user");
    setError("");
  }

  function closeEdit() {
    setEditing(null);
    setError("");
  }

  function openReset(u: QuanTriUser) {
    setResetting(u);
    setResetPwd("");
    setResetPwd2("");
    setError("");
  }

  function closeReset() {
    setResetting(null);
    setResetPwd("");
    setResetPwd2("");
    setError("");
  }

  async function saveResetPassword() {
    if (!resetting) return;
    if (resetPwd.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự");
      return;
    }
    if (resetPwd !== resetPwd2) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    setBusyId(resetting.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${resetting.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không đặt lại được mật khẩu");
        return;
      }
      closeReset();
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusyId(null);
    }
  }

  async function unlockChuHui(u: QuanTriUser) {
    if (u.rule !== "user" || u.chuHuiAccessUnlocked) return;
    setBusyId(u.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chuHuiAccessUnlocked: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không mở khóa được");
        return;
      }
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusyId(null);
    }
  }

  async function lockChuHui(u: QuanTriUser) {
    if (u.rule !== "user" || !u.chuHuiAccessUnlocked) return;
    if (
      !window.confirm(
        `Khóa tài khoản "${u.name}"? Họ sẽ phải trong diện dùng thử / hết hạn như quy định (có thể cần mở khóa lại sau).`,
      )
    ) {
      return;
    }
    setBusyId(u.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chuHuiAccessUnlocked: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không khóa được");
        return;
      }
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(u: QuanTriUser) {
    if (u.id === currentAdminId) return;
    if (!window.confirm(`Xóa tài khoản "${u.name}" (${u.phone})? Không thể hoàn tác.`)) return;
    setBusyId(u.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { message?: string }).message ?? "Không xóa được");
        return;
      }
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusyId(null);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setBusyId(editing.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          rule: editRule,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không lưu được");
        return;
      }
      closeEdit();
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-indigo-50/40">
      <header className="border-b border-indigo-200/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Quản trị hệ thống</p>
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">TS QUẢN LÝ — Admin</h1>
            <p className="text-sm text-slate-600">
              Xin chào <span className="font-semibold text-slate-900">{currentAdminName}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LogoutButton className="px-4 py-2 text-sm" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <span className="font-semibold">Quyền riêng tư:</span> Mỗi chủ hụi chỉ xem được dây hụi, hụi viên và kỳ
          khui của chính mình. <span className="font-semibold">Admin không truy cập</span> được ứng dụng hay dữ liệu
          chủ hụi — chỉ quản lý tài khoản tại đây.{" "}
          <span className="font-semibold">Dùng thử chủ hụi:</span> 10 ngày kể từ ngày tạo tài khoản; hết hạn cần bấm{" "}
          <span className="font-semibold">Mở khóa</span> để họ dùng tiếp. Cột <span className="font-semibold">Dây hụi</span>{" "}
          và <span className="font-semibold">Tiền cò</span> là tổng theo dữ liệu của từng chủ hụi. Nút{" "}
          <span className="font-semibold">Khóa</span> thu hồi quyền mở khóa (áp dụng lại dùng thử).
        </p>

        <section className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Tài khoản chủ hụi" value={stats.chuHui} tone="slate" />
          <StatCard label="Tài khoản admin" value={stats.admin} tone="indigo" />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="text-lg font-bold text-slate-900">Tài khoản</h2>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên, SĐT, vai trò, số dây…"
              className="w-full max-w-xs rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              aria-label="Tìm tài khoản"
            />
          </div>

          {error && !editing && !resetting ? (
            <p className="px-4 py-2 text-sm text-rose-600 sm:px-6">{error}</p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-slate-700">
                  <th className="px-4 py-3 font-bold">Họ tên</th>
                  <th className="px-4 py-3 font-bold">SĐT</th>
                  <th className="px-4 py-3 font-bold">Vai trò</th>
                  <th className="px-4 py-3 font-bold">Dây hụi</th>
                  <th className="px-4 py-3 font-bold">Tiền cò</th>
                  <th className="px-4 py-3 font-bold">Dùng thử</th>
                  <th className="px-4 py-3 font-bold">Tạo lúc</th>
                  <th className="px-4 py-3 font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">{u.name}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{u.phone}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          u.rule === "admin"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.rule === "admin" ? "Admin" : "Chủ hụi"}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {u.rule === "admin" ? "—" : formatCount(u.huiLineCount)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {u.rule === "admin" ? "—" : formatMoneyVn(u.tienCoTong)}
                    </td>
                    <td className="px-4 py-3">
                      {u.rule === "admin" ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : u.chuHuiAccessUnlocked ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                          Đã mở khóa
                        </span>
                      ) : chuHuiTrialDaysRemaining(new Date(u.createdAt)) > 0 ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                          Còn {chuHuiTrialDaysRemaining(new Date(u.createdAt))} ngày
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                          Hết hạn
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          disabled={busyId !== null}
                          className="rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-800 transition hover:bg-indigo-100 disabled:opacity-50"
                        >
                          Sửa
                        </button>
                        {u.rule === "user" && !u.chuHuiAccessUnlocked ? (
                          <button
                            type="button"
                            onClick={() => void unlockChuHui(u)}
                            disabled={busyId !== null}
                            className="rounded-lg border border-emerald-400 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Mở khóa
                          </button>
                        ) : null}
                        {u.rule === "user" && u.chuHuiAccessUnlocked ? (
                          <button
                            type="button"
                            onClick={() => void lockChuHui(u)}
                            disabled={busyId !== null}
                            className="rounded-lg border border-slate-400 bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-800 transition hover:bg-slate-200 disabled:opacity-50"
                          >
                            Khóa
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openReset(u)}
                          disabled={busyId !== null}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Mật khẩu
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteUser(u)}
                          disabled={busyId !== null || u.id === currentAdminId}
                          title={u.id === currentAdminId ? "Không thể xóa chính mình" : undefined}
                          className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 id="edit-user-title" className="text-lg font-bold text-slate-900">
              Sửa tài khoản
            </h3>
            <p className="mt-1 text-xs text-slate-500">ID: {editing.id}</p>

            {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

            <label className="mt-4 grid gap-1">
              <span className="text-sm font-medium text-slate-700">Họ tên</span>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
              />
            </label>
            <label className="mt-3 grid gap-1">
              <span className="text-sm font-medium text-slate-700">Số điện thoại (đăng nhập)</span>
              <input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
              />
            </label>
            <label className="mt-3 grid gap-1">
              <span className="text-sm font-medium text-slate-700">Vai trò</span>
              <select
                value={editRule}
                onChange={(e) => setEditRule(e.target.value as "user" | "admin")}
                className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
              >
                <option value="user">Chủ hụi (user)</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            {editing.id === currentAdminId && editRule === "user" ? (
              <p className="mt-3 text-xs text-amber-800">
                Bạn đang sửa chính mình. Nếu đổi thành Chủ hụi, cần còn ít nhất một admin khác.
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                disabled={busyId !== null}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={busyId !== null}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busyId ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resetting ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-pwd-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 id="reset-pwd-title" className="text-lg font-bold text-slate-900">
              Đặt lại mật khẩu
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Tài khoản: <span className="font-semibold text-slate-900">{resetting.name}</span> — {resetting.phone}
            </p>

            {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

            <label className="mt-4 grid gap-1">
              <span className="text-sm font-medium text-slate-700">Mật khẩu mới</span>
              <input
                type="password"
                autoComplete="new-password"
                value={resetPwd}
                onChange={(e) => setResetPwd(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
              />
            </label>
            <label className="mt-3 grid gap-1">
              <span className="text-sm font-medium text-slate-700">Nhập lại mật khẩu</span>
              <input
                type="password"
                autoComplete="new-password"
                value={resetPwd2}
                onChange={(e) => setResetPwd2(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
              />
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeReset}
                disabled={busyId !== null}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void saveResetPassword()}
                disabled={busyId !== null}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busyId ? "Đang lưu…" : "Lưu mật khẩu"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "indigo" | "emerald" | "sky" | "violet" | "amber";
}) {
  const ring = {
    slate: "border-slate-200 bg-slate-50",
    indigo: "border-indigo-200 bg-indigo-50",
    emerald: "border-emerald-200 bg-emerald-50",
    sky: "border-sky-200 bg-sky-50",
    violet: "border-violet-200 bg-violet-50",
    amber: "border-amber-200 bg-amber-50",
  }[tone];
  const num = {
    slate: "text-slate-900",
    indigo: "text-indigo-900",
    emerald: "text-emerald-900",
    sky: "text-sky-900",
    violet: "text-violet-900",
    amber: "text-amber-900",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${ring}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold tabular-nums ${num}`}>{formatCount(value)}</p>
    </div>
  );
}
