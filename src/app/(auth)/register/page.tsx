"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import PasswordInput from "@/components/password-input";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Đăng ký thất bại");
        return;
      }

      setMessage("Đăng ký thành công. Chuyển sang trang đăng nhập...");
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-blue-200 bg-white/95 p-7 shadow-[0_10px_40px_-16px_rgba(30,64,175,0.35)] backdrop-blur">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tạo tài khoản</h1>
      <p className="mt-1 text-sm text-slate-600">Đăng ký nhanh để sử dụng hệ thống.</p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <input
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          placeholder="Họ và tên"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          required
        />
        <input
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          placeholder="Số điện thoại"
          value={form.phone}
          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          required
        />
        <PasswordInput
          value={form.password}
          onChange={(password) => setForm((p) => ({ ...p, password }))}
          autoComplete="new-password"
          required
          disabled={loading}
        />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Đang xử lý..." : "Đăng ký"}
        </button>
      </form>

      <p className="mt-5 text-sm text-slate-600">
        Đã có tài khoản?{" "}
        <Link className="font-semibold text-blue-600 hover:text-blue-700" href="/login">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
