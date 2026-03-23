/**
 * Lightweight perf helpers for production-safe timing logs.
 * Format: [perf] name=... duration=...ms
 */
export function perfNowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export function logPerf(name: string, startedAtMs: number, extra?: string) {
  const duration = perfNowMs() - startedAtMs;
  const suffix = extra ? ` ${extra}` : "";
  console.log(`[perf] name=${name} duration=${duration.toFixed(1)}ms${suffix}`);
}
