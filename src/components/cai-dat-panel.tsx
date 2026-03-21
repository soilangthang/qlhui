"use client";

import { useEffect, useState } from "react";

type OwnerReceiptSetting = {
  huiName: string;
  ownerName: string;
  address: string;
  phone: string;
  bankAccount: string;
  bankName: string;
  accountName: string;
  qrImageUrl: string;
  qrImageDataUrl?: string;
  phieuGhiChu: string;
};

const EMPTY_SETTING: OwnerReceiptSetting = {
  huiName: "",
  ownerName: "",
  address: "",
  phone: "",
  bankAccount: "",
  bankName: "",
  accountName: "",
  qrImageUrl: "",
  phieuGhiChu: "",
};

export default function CaiDatPanel() {
  const [form, setForm] = useState<OwnerReceiptSetting>(EMPTY_SETTING);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadSetting() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/cai-dat");
        const data = await res.json();
        if (!res.ok) {
          setError(data.message ?? "Không tải được cài đặt");
          return;
        }
        setForm({
          huiName: data.setting?.huiName ?? "",
          ownerName: data.setting?.ownerName ?? "",
          address: data.setting?.address ?? "",
          phone: data.setting?.phone ?? "",
          bankAccount: data.setting?.bankAccount ?? "",
          bankName: data.setting?.bankName ?? "",
          accountName: data.setting?.accountName ?? "",
          qrImageUrl: data.setting?.qrImageUrl ?? "",
          qrImageDataUrl: data.setting?.qrImageDataUrl ?? "",
          phieuGhiChu: data.setting?.phieuGhiChu ?? "",
        });
      } catch {
        setError("Không thể kết nối máy chủ");
      } finally {
        setLoading(false);
      }
    }
    void loadSetting();
  }, []);

  function updateField<K extends keyof OwnerReceiptSetting>(field: K, value: OwnerReceiptSetting[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function saveSetting(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/cai-dat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể lưu cài đặt");
        return;
      }
      setSuccess("Đã lưu cài đặt phiếu thu.");
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  }

  async function uploadQrFile() {
    if (!qrFile) {
      setError("Vui lòng chọn ảnh QR trước khi upload");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const fd = new FormData();
      fd.append("file", qrFile);
      const res = await fetch("/api/cai-dat", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể upload ảnh QR");
        return;
      }
      setForm((prev) => ({ ...prev, qrImageDataUrl: data.qrImageDataUrl ?? "" }));
      setQrFile(null);
      setSuccess("Đã upload ảnh QR vào database.");
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="min-h-[calc(100vh-140px)] rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Cài đặt phiếu thu</h2>
      <p className="mt-1 text-sm text-slate-600">Thông tin này sẽ hiển thị trên mẫu phiếu thu chi tiết.</p>

      {loading ? <p className="mt-4 text-sm text-slate-500">Đang tải cài đặt...</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      {success ? <p className="mt-4 text-sm text-emerald-600">{success}</p> : null}

      <form onSubmit={saveSetting} className="mt-4 grid gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Tên hụi</span>
          <input
            value={form.huiName}
            onChange={(e) => updateField("huiName", e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
            placeholder="VD: Hụi mini Ngân Nie"
            required
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Tên chủ hụi</span>
          <input
            value={form.ownerName}
            onChange={(e) => updateField("ownerName", e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
            placeholder="VD: Đoàn Hà Kim Ngân"
            required
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Địa chỉ</span>
          <input
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
            placeholder="Phường Duyên Hải, Trà Vinh"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Điện thoại</span>
          <input
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
            placeholder="0379192401"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Số tài khoản</span>
          <input
            value={form.bankAccount}
            onChange={(e) => updateField("bankAccount", e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
            placeholder="488388688888"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Ngân hàng</span>
          <input
            value={form.bankName}
            onChange={(e) => updateField("bankName", e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
            placeholder="MBBank"
          />
        </label>
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Tên chủ tài khoản</span>
          <input
            value={form.accountName}
            onChange={(e) => updateField("accountName", e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
            placeholder="Đoàn Hà Kim Ngân"
          />
        </label>
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Ghi chú trên phiếu tạm thu (khối GHI CHÚ)</span>
          <textarea
            value={form.phieuGhiChu}
            onChange={(e) => updateField("phieuGhiChu", e.target.value)}
            rows={7}
            className="min-h-[140px] resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 font-sans text-sm outline-none focus:border-blue-400"
            placeholder="Mỗi dòng một ý (xuống dòng). Có thể dùng emoji. Để trống = dùng mẫu mặc định trên phiếu."
          />
          <span className="text-xs text-slate-500">
            Lưu cùng nút &quot;Lưu cài đặt&quot; bên dưới. Xóa hết nội dung và lưu để quay về mẫu mặc định.
          </span>
        </label>
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Update mã QR (URL ảnh QR)</span>
          <input
            value={form.qrImageUrl}
            onChange={(e) => updateField("qrImageUrl", e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-400"
            placeholder="Dán link ảnh QR tùy chỉnh (nếu để trống sẽ tự tạo QR theo STK)"
          />
        </label>
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Upload ảnh QR trực tiếp (lưu DB)</span>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => setQrFile(e.target.files?.[0] ?? null)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={uploadQrFile}
              disabled={loading || uploading}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {uploading ? "Đang upload..." : "Upload QR"}
            </button>
          </div>
          {form.qrImageDataUrl ? (
            <img
              src={form.qrImageDataUrl}
              alt="QR đã upload"
              className="mt-2 h-36 w-36 rounded-lg border border-slate-300 bg-white p-1"
            />
          ) : null}
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={saving || loading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu cài đặt"}
          </button>
        </div>
      </form>
    </section>
  );
}
