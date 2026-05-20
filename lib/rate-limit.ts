/**
 * Rate limiter.
 *
 * Production: Vercel KV (Upstash Redis) — sliding window log.
 * Dev: in-memory Map with TTL — сбрасывается при перезапуске.
 *
 * Использование:
 *   const { success, remaining } = await rateLimit("user:123", 120, 60);
 *   if (!success) return new Response("Too Many Requests", { status: 429 });
 */

import { cacheGet, cacheSet } from "@/lib/cache";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

// ── In-memory fallback ────────────────────────────────────────────────

interface WindowEntry {
  count: number;
  resetAt: number;
}

const memoryWindows = new Map<string, WindowEntry>();

function memoryRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const entry = memoryWindows.get(key);

  if (!entry || now > entry.resetAt) {
    memoryWindows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { success: true, remaining: limit - 1, reset: now + windowSeconds * 1000 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, reset: entry.resetAt };
}

// ── Vercel KV sliding window ─────────────────────────────────────────

async function kvRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / (windowSeconds * 1000))}`;

  const current = await cacheGet<number>(windowKey);
  if (current === null) {
    await cacheSet(windowKey, 1, windowSeconds);
    return { success: true, remaining: limit - 1, reset: now + windowSeconds * 1000 };
  }

  if (current >= limit) {
    return { success: false, remaining: 0, reset: now + windowSeconds * 1000 };
  }

  await cacheSet(windowKey, current + 1, windowSeconds);
  return { success: true, remaining: limit - current - 1, reset: now + windowSeconds * 1000 };
}

// ── Public API ───────────────────────────────────────────────────────

export async function rateLimit(
  identifier: string,
  limit = 120,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  try {
    if (process.env.KV_URL || process.env.REDIS_URL) {
      return kvRateLimit(identifier, limit, windowSeconds);
    }
    return memoryRateLimit(identifier, limit, windowSeconds);
  } catch {
    // On error, tight rate limit as fallback (fail-restricted)
    return { success: true, remaining: 1, reset: Date.now() + 60000 };
  }
}
