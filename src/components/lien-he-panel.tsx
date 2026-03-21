import Link from "next/link";

import { zaloChatWebUrl } from "@/lib/zalo-link";

function formatPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("0")) {
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  }
  return raw.trim() || "—";
}

const STEPS: { title: string; href: string; body: string }[] = [
  {
    title: "Hụi viên",
    href: "/hui-vien",
    body: "Khai báo danh bạ người tham gia (tên, SĐT).",
  },
  {
    title: "Dây hụi",
    href: "/day-hui",
    body: "Tạo dây, gán chân, mức hụi, tiền cò; khui kỳ và nhập người hốt, giá thăm.",
  },
  {
    title: "Thu tiền",
    href: "/thu-tien",
    body: "Xác nhận đã giao tiền cho người hốt theo từng kỳ.",
  },
  {
    title: "Chi tiết Hụi viên",
    href: "/chi-tiet-hui-vien",
    body: "Xem tổng hợp theo từng người trên các dây.",
  },
  {
    title: "Theo dõi",
    href: "/theo-doi",
    body: "Đánh dấu ai đã đóng đủ kỳ mới nhất (đồng bộ với Thu tiền).",
  },
  {
    title: "Báo cáo",
    href: "/bao-cao",
    body: "Tổng âm / dương theo hụi viên (góc chủ hụi).",
  },
  {
    title: "Cài đặt",
    href: "/cai-dat",
    body: "Thông tin in phiếu, QR, ghi chú trên phiếu tạm thu.",
  },
];

export default function LienHePanel({ zaloPhoneRaw }: { zaloPhoneRaw: string }) {
  const trimmed = zaloPhoneRaw.trim();
  const chatUrl = trimmed ? zaloChatWebUrl(trimmed) : null;
  const display = trimmed ? formatPhoneDisplay(trimmed) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-sky-50/80 p-6 shadow-md md:p-10 lg:p-12">
        <div
          className="pointer-events-none absolute -right-24 -top-20 h-56 w-56 rounded-full bg-amber-400/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl"
          aria-hidden
        />

        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800/80 md:text-sm">
            Hướng dẫn nhanh
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl lg:text-4xl">
            Cách vận hành ứng dụng
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-700 md:text-lg md:leading-relaxed">
            <span className="font-semibold text-slate-900">TS QUẢN LÝ</span> hỗ trợ chủ hụi quản lý dây, kỳ khui và
            theo dõi đóng tiền. Dưới đây là các bước chính — bấm vào từng ô để mở đúng trang.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:gap-5">
            {STEPS.map((step, i) => (
              <Link
                key={step.href}
                href={step.href}
                className="group flex gap-4 rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-amber-300/80 hover:bg-white hover:shadow-md hover:ring-amber-500/15 md:p-6"
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-lg font-black text-white shadow-md shadow-amber-600/25 md:h-14 md:w-14 md:text-xl"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-lg font-bold text-slate-900 md:text-xl">{step.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600 md:text-base md:leading-relaxed">
                    {step.body}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-amber-700 group-hover:text-amber-800">
                    Mở trang →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-[#0068ff]/30 bg-gradient-to-br from-[#0068ff]/14 via-white to-sky-50 p-6 shadow-lg md:p-10 lg:p-12">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#0068ff]/25 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0052cc] md:text-sm">Hỗ trợ</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            Liên hệ quản trị / hỗ trợ
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-700 md:text-lg">
            Cần hướng dẫn thêm, báo lỗi hoặc góp ý — chat trực tiếp qua Zalo với admin phần mềm.
          </p>

          {display && chatUrl ? (
            <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-stretch">
              <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm sm:min-w-[240px]">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Zalo admin</p>
                <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900 md:text-4xl">
                  {display}
                </p>
              </div>
              <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-[#0052cc]/40 bg-[#0068ff]/10 p-4 sm:min-w-[280px]">
                <a
                  href={chatUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full min-h-[56px] items-center justify-center gap-3 rounded-2xl border-2 border-[#003d99] px-8 py-4 text-center text-lg font-extrabold tracking-wide shadow-[0_8px_28px_rgba(0,104,255,0.45)] transition hover:brightness-110 hover:shadow-[0_10px_32px_rgba(0,104,255,0.5)] active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0068ff] focus-visible:ring-offset-2 no-underline md:min-h-[60px] md:text-xl"
                  style={{ backgroundColor: "#0068ff", color: "#ffffff" }}
                >
                  <svg
                    className="h-8 w-8 shrink-0 text-white md:h-9 md:w-9"
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
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5 text-base text-amber-950 md:text-lg">
              <p className="font-bold">Chưa cấu hình số Zalo admin</p>
              <p className="mt-2 leading-relaxed text-amber-900/95">
                Thêm biến{" "}
                <code className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-sm">NEXT_PUBLIC_ZALO_ADMIN_PHONE</code>{" "}
                trong file <code className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-sm">.env</code> (ví dụ số
                10 chữ bắt đầu bằng 0), sau đó khởi động lại server.
              </p>
            </div>
          )}

          <p className="mt-6 text-sm text-slate-600 md:text-base">
            Nút mở <span className="font-semibold text-slate-800">zalo.me</span> trên trình duyệt hoặc app Zalo (nếu đã
            cài).
          </p>
        </div>
      </section>

      <p className="text-center text-sm text-slate-600 md:text-base">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 font-semibold text-blue-700 underline-offset-4 hover:text-blue-800 hover:underline"
        >
          ← Về Dashboard
        </Link>
      </p>
    </div>
  );
}
