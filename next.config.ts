import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

/** Thư mục chứa package.json — cố định theo file config, tránh Turbopack lấy nhầm root (vd. C:\\Users\\TUAN). */
const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
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
