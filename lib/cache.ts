/**
 * Абстракция кэширования.
 *
 * В production (Vercel) использует Vercel KV (Upstash Redis).
 * В development/local использует in-memory Map с TTL.
 * Прозрачно падает на промах (cache miss = null), never throws.
 */

// ── In-memory fallback для dev ────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const memoryStore = new Map<string, CacheEntry<unknown>>();

function memoryGet<T>(key: string): T | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value as T;
}

function memorySet<T>(key: string, value: T, ttlSeconds: number): void {
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  // Ленивая очистка: удалять записи, если store > 1000
  if (memoryStore.size > 1000) {
    const now = Date.now();
    for (const [k, v] of memoryStore) {
      if (now > v.expiresAt) memoryStore.delete(k);
    }
  }
}

// ── Vercel KV (Upstash Redis) ─────────────────────────────────────────

type KvClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { ex: number }) => Promise<unknown>;
  del: (...keys: string[]) => Promise<number>;
  sadd: (key: string, ...members: string[]) => Promise<number>;
  smembers: (key: string) => Promise<string[]>;
  srem: (key: string, ...members: string[]) => Promise<number>;
};

let kv: KvClient | null = null;

async function getKv(): Promise<KvClient | null> {
  if (kv) return kv;
  if (process.env.KV_URL || process.env.REDIS_URL) {
    try {
      const { Redis } = await import("@upstash/redis");
      kv = new Redis({
        url: process.env.KV_URL ?? process.env.REDIS_URL ?? "",
        token: process.env.KV_REST_API_TOKEN ?? "",
      }) as unknown as KvClient;
    } catch {
      // fallback to memory
    }
  }
  return kv;
}

// ── Track cache keys by userId for pattern invalidation ────────────

const userKeys = new Map<string, Set<string>>();

function extractUserId(key: string): string | null {
  // key pattern: report:{type}:{format}:{userId}:{scopeHash}
  const parts = key.split(":");
  if (parts[0] === "report" && parts.length >= 4) return parts[3];
  return null;
}

// ── Public API ───────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = await getKv();
    if (client) {
      const raw = await client.get(key);
      if (raw == null) return null;
      return JSON.parse(raw as string) as T;
    }
    return memoryGet<T>(key);
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
  try {
    const uid = extractUserId(key);
    const client = await getKv();

    if (client) {
      if (uid) {
        // Track key in Redis Set for cross-instance invalidation
        const setKey = `report:user:keys:${uid}`;
        await client.sadd(setKey, key).catch(() => {});
        // Set a TTL on the tracking set as well (max 1h)
        await client.set(`__ttl:${setKey}`, "1", { ex: 3600 }).catch(() => {});
      }
      await client.set(key, JSON.stringify(value), { ex: ttlSeconds });
      return;
    }

    // In-memory fallback
    if (uid) {
      if (!userKeys.has(uid)) userKeys.set(uid, new Set());
      userKeys.get(uid)!.add(key);
    }
    memorySet(key, value, ttlSeconds);
  } catch {
    // non-critical — cache miss is fine
  }
}

/**
 * Invalidate all cached values for a given user.
 * Useful when report scope changes (course assignment, observer link, etc.).
 * Uses Redis Set for cross-instance key tracking; in-memory Map for dev.
 */
export async function cacheDeleteByUser(userId: string): Promise<void> {
  const setKey = `report:user:keys:${userId}`;
  try {
    const client = await getKv();
    if (client) {
      const keys = await client.smembers(setKey).catch(() => [] as string[]);
      if (keys.length > 0) {
        await client.del(...keys).catch(() => {});
        await client.del(setKey).catch(() => {});
        await client.del(`__ttl:${setKey}`).catch(() => {});
      }
      return;
    }
  } catch {
    // fallback below
  }

  // In-memory fallback (dev/local)
  try {
    const keys = userKeys.get(userId);
    if (keys) {
      for (const key of keys) memoryStore.delete(key);
      userKeys.delete(userId);
    }
  } catch {
    // non-critical
  }
}

// ── Synchronous in-memory cache for reports ───────────────────────────

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private defaultTTL: number;

  constructor(defaultTTLMs = 5 * 60 * 1000) {
    this.defaultTTL = defaultTTLMs;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.store.set(key, {
      value: data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL),
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

export const reportCache = new MemoryCache(5 * 60 * 1000);
