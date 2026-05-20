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
  del?: (key: string) => Promise<unknown>;
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
    const client = await getKv();
    if (client) {
      await client.set(key, JSON.stringify(value), { ex: ttlSeconds });
      return;
    }
    memorySet(key, value, ttlSeconds);
  } catch {
    // non-critical — cache miss is fine
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    const client = await getKv();
    if (client) {
      // Upstash Redis supports .del()
      if ("del" in client) {
        await (client as unknown as { del: (key: string) => Promise<void> }).del(key);
      }
      return;
    }
    memoryStore.delete(key);
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
