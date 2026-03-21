"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={loading}
      className={`rounded-xl border border-rose-400/40 bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading ? "Đang đăng xuất..." : "Đăng xuất"}
    </button>
  );
}
