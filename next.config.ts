import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

/** Thư mục chứa package.json — cố định theo file config, tránh Turbopack lấy nhầm root (vd. C:\\Users\\TUAN). */
const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /** Dùng distDir riêng để tránh lỗi artifact .next bị hỏng trên Windows (local only).
   * Trên Vercel, giữ mặc định `.next` để Vercel tìm đúng `routes-manifest.json`.
   */
  ...(process.env.VERCEL ? {} : { distDir: ".next-prod" }),
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  /** Tránh bundle Prisma vào .next — nếu không, Turbopack có thể giữ client cũ (thiếu model mới sau generate). */
  serverExternalPackages: ["@prisma/client", "prisma"],
  turbopack: {
    root: PROJECT_ROOT,
    resolveAlias: {
      tailwindcss: path.join(PROJECT_ROOT, "node_modules", "tailwindcss"),
    },
  },
};

export default nextConfig;
