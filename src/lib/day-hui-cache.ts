type CachedLines = {
  expiresAt: number;
  lines: unknown[];
};

const TTL_MS = 10_000;
const byUserId = new Map<string, CachedLines>();

export function getDayHuiLinesCache(userId: string): unknown[] | null {
  const hit = byUserId.get(userId);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    byUserId.delete(userId);
    return null;
  }
  return hit.lines;
}

export function setDayHuiLinesCache(userId: string, lines: unknown[]) {
  byUserId.set(userId, { lines, expiresAt: Date.now() + TTL_MS });
}

export function clearDayHuiLinesCache(userId: string) {
  byUserId.delete(userId);
}
