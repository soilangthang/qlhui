#!/usr/bin/env node
import { performance } from "node:perf_hooks";

/**
 * Lightweight benchmark to compare before/after optimizations.
 *
 * Usage (PowerShell):
 *   $env:BENCH_BASE_URL="http://localhost:3000"
 *   $env:BENCH_COOKIE="auth-token=..."
 *   node scripts/benchmark-tab-switch.mjs
 */

const baseUrl = process.env.BENCH_BASE_URL || "http://localhost:3000";
const cookie = process.env.BENCH_COOKIE || "";
const rounds = Number(process.env.BENCH_ROUNDS || 12);
const warmup = Number(process.env.BENCH_WARMUP || 2);

const endpoints = [
  "/dashboard",
  "/day-hui",
  "/thu-tien",
  "/theo-doi",
  "/bao-cao",
  "/chi-tiet-hui-vien",
  "/api/day-hui",
  "/api/hui-vien",
  "/api/auth/me",
];

function quantile(sorted, q) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[idx];
}

async function hit(path) {
  const t0 = performance.now();
  const res = await fetch(`${baseUrl}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: "follow",
  });
  const t1 = performance.now();
  await res.arrayBuffer();
  return { ms: t1 - t0, status: res.status };
}

async function benchOne(path) {
  const samples = [];
  const statusCounts = new Map();
  for (let i = 0; i < warmup + rounds; i += 1) {
    const r = await hit(path);
    if (i >= warmup) {
      samples.push(r);
      statusCounts.set(r.status, (statusCounts.get(r.status) ?? 0) + 1);
    }
  }
  const ok = samples.filter((s) => s.status >= 200 && s.status < 400).length;
  const arr = samples.map((s) => s.ms).sort((a, b) => a - b);
  const avg = arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
  const statusBreakdown = [...statusCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([status, count]) => `${status}:${count}`)
    .join(",");
  return {
    path,
    ok,
    total: samples.length,
    p50: quantile(arr, 0.5),
    p95: quantile(arr, 0.95),
    avg,
    statusBreakdown,
  };
}

function looksLikeInvalidCookie(rawCookie) {
  if (!rawCookie) return false;
  // Hỗ trợ cả tên cũ auth-token và tên hiện tại auth_token.
  const m = rawCookie.match(/auth(?:_|-)token=([^;]+)/);
  const token = (m?.[1] ?? "").trim();
  if (!token) return true;
  if (token.startsWith("<") || token.endsWith(">")) return true;
  const parts = token.split(".");
  // JWT must be exactly 3 base64url segments.
  if (parts.length !== 3) return true;
  return false;
}

async function main() {
  console.log(`[bench] baseUrl=${baseUrl} rounds=${rounds} warmup=${warmup}`);
  if (!cookie) {
    console.log("[bench] warning: BENCH_COOKIE is empty (protected routes may redirect to login)");
  } else if (looksLikeInvalidCookie(cookie)) {
    console.log(
      "[bench] warning: BENCH_COOKIE seems invalid (use auth_token=<JWT>, no < >, exactly 3 JWT segments)",
    );
  }
  const out = [];
  for (const path of endpoints) {
    const r = await benchOne(path);
    out.push(r);
    console.log(
      `[bench] path=${r.path} ok=${r.ok}/${r.total} status=${r.statusBreakdown} avg=${r.avg.toFixed(1)}ms p50=${r.p50.toFixed(1)}ms p95=${r.p95.toFixed(1)}ms`,
    );
  }
  const slow = [...out].sort((a, b) => b.p95 - a.p95).slice(0, 5);
  console.log("\n[bench] top-p95");
  for (const r of slow) {
    console.log(`- ${r.path}: p95=${r.p95.toFixed(1)}ms avg=${r.avg.toFixed(1)}ms`);
  }

  const authRelated = out.filter((r) => r.path.startsWith("/api/"));
  const allApiFailed = authRelated.length > 0 && authRelated.every((r) => r.ok === 0);
  if (allApiFailed) {
    console.log(
      "\n[bench] hint: all protected APIs failed. Re-check BENCH_COOKIE format: auth_token=<JWT without angle brackets>.",
    );
  }
}

main().catch((e) => {
  console.error("[bench] failed", e);
  process.exitCode = 1;
});
