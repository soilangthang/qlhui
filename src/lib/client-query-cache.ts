type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const mem = new Map<string, CacheEntry<unknown>>();
const MIN_TTL_MS = 60_000;

export function getClientCache<T>(key: string): T | null {
  const cur = mem.get(key);
  if (!cur) return null;
  if (cur.expiresAt <= Date.now()) {
    mem.delete(key);
    return null;
  }
  return cur.value as T;
}

export function setClientCache<T>(key: string, value: T, ttlMs: number) {
  // Giữ cache đủ lâu để người dùng chuyển tab qua lại vẫn thấy phản hồi gần như tức thì.
  mem.set(key, { value, expiresAt: Date.now() + Math.max(MIN_TTL_MS, ttlMs) });
}

export function deleteClientCache(key: string) {
  mem.delete(key);
}

export function deleteClientCacheByPrefix(prefix: string) {
  for (const key of mem.keys()) {
    if (key.startsWith(prefix)) mem.delete(key);
  }
}
