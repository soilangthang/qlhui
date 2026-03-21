import Link from "next/link";

import { zaloChatWebUrl } from "@/lib/zalo-link";

function formatPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("0")) {
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  }
  return raw.trim() || "—";
}

export default function LienHePanel({ zaloPhoneRaw }: { zaloPhoneRaw: string }) {
  const trimmed = zaloPhoneRaw.trim();
  const chatUrl = trimmed ? zaloChatWebUrl(trimmed) : null;
  const display = trimmed ? formatPhoneDisplay(trimmed) : null;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm md:p-8">
        <h2 className="text-xl font-bold text-slate-900">Cách vận hành ứng dụng</h2>
        <p className="mt-2 text-sm text-slate-600">
          TS QUẢN LÝ hỗ trợ chủ hụi quản lý dây, kỳ khui và theo dõi đóng tiền — các bước chính:
        </p>
        <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-800 marker:font-bold">
          <li>
            <span className="font-semibold text-slate-900">Hụi viên</span> — khai báo danh bạ người tham gia (tên,
            SĐT).
          </li>
          <li>
            <span className="font-semibold text-slate-900">Dây hụi</span> — tạo dây, gán chân, mức hụi, tiền cò; khui
            kỳ và nhập người hốt, giá thăm.
          </li>
          <li>
            <span className="font-semibold text-slate-900">Thu tiền</span> — xác nhận đã giao tiền cho người hốt theo
            từng kỳ.
          </li>
          <li>
            <span className="font-semibold text-slate-900">Chi tiết Hụi viên</span> — xem tổng hợp theo từng người trên
            các dây.
          </li>
          <li>
            <span className="font-semibold text-slate-900">Theo dõi</span> — đánh dấu ai đã đóng đủ kỳ mới nhất (đồng bộ
            với Thu tiền).
          </li>
          <li>
            <span className="font-semibold text-slate-900">Báo cáo</span> — tổng âm/dương theo hụi viên (góc chủ hụi).
          </li>
          <li>
            <span className="font-semibold text-slate-900">Cài đặt</span> — thông tin in phiếu, QR, ghi chú trên phiếu
            tạm thu.
          </li>
        </ol>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-[#0068ff]/35 bg-gradient-to-br from-[#0068ff]/12 via-white to-sky-50 p-6 shadow-lg md:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#0068ff]/20 blur-2xl"
          aria-hidden
        />
        <div className="relative">
          <h2 className="text-xl font-bold text-slate-900">Liên hệ quản trị / hỗ trợ</h2>
          <p className="mt-2 text-sm text-slate-600">
            Cần hướng dẫn thêm, báo lỗi hoặc góp ý — chat trực tiếp qua Zalo với admin phần mềm.
          </p>

          {display && chatUrl ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Zalo admin</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{display}</p>
              </div>
              <div className="rounded-2xl border-2 border-[#0052cc] bg-[#0068ff]/15 p-4 shadow-inner sm:inline-block sm:p-5">
                <a
                  href={chatUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full min-h-[52px] items-center justify-center gap-3 rounded-xl border-2 border-[#003d99] px-6 py-4 text-center text-base font-extrabold tracking-wide shadow-[0_6px_20px_rgba(0,104,255,0.5)] transition hover:brightness-110 hover:shadow-[0_8px_28px_rgba(0,104,255,0.55)] active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0068ff] focus-visible:ring-offset-2 sm:min-w-[min(100%,320px)] no-underline"
                  style={{ backgroundColor: "#0068ff", color: "#ffffff" }}
                >
                  <svg
                    className="h-7 w-7 shrink-0 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M12 2C6.48 2 2 5.69 2 10.2c0 2.43 1.32 4.62 3.4 6.05-.15.85-.54 2.47-1.1 3.55-.08.16-.02.35.14.44.13.08.3.07.42-.02 1.24-.89 2.96-2.4 3.85-3.17.93.26 1.92.4 2.93.4 5.52 0 10-3.69 10-8.2S17.52 2 12 2zm-1 11H9V9h2v4zm4 0h-2V9h2v4z" />
                  </svg>
                  <span>Chat ngay trên Zalo</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-semibold">Chưa cấu hình số Zalo admin</p>
              <p className="mt-1 text-amber-900/90">
                Thêm biến <code className="rounded bg-amber-100 px-1 font-mono text-xs">NEXT_PUBLIC_ZALO_ADMIN_PHONE</code>{" "}
                trong file <code className="rounded bg-amber-100 px-1 font-mono text-xs">.env</code> (ví dụ số 10 chữ
                bắt đầu bằng 0), sau đó khởi động lại server.
              </p>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Nút mở <span className="font-medium">zalo.me</span> trên trình duyệt hoặc app Zalo (nếu đã cài).
          </p>
        </div>
      </section>

      <p className="text-center text-xs text-slate-500">
        <Link href="/dashboard" className="font-medium text-blue-700 hover:underline">
          ← Về Dashboard
        </Link>
      </p>
    </div>
  );
}
