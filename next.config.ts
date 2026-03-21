import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Tránh bundle Prisma vào .next — nếu không, Turbopack có thể giữ client cũ (thiếu model mới sau generate). */
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
