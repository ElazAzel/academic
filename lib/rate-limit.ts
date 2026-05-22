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

import { cacheIncr } from "@/lib/cache";

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

// ── Vercel KV sliding window (атомарный INCR) ─────────────────────────

async function kvRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / (windowSeconds * 1000))}`;

  const count = await cacheIncr(windowKey, windowSeconds);
  if (count === 1) {
    // Первый запрос в окне — INCR уже создал ключ с TTL через expire
    return { success: true, remaining: limit - 1, reset: now + windowSeconds * 1000 };
  }

  if (count > limit) {
    return { success: false, remaining: 0, reset: now + windowSeconds * 1000 };
  }

  return { success: true, remaining: limit - count, reset: now + windowSeconds * 1000 };
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
    // Fail-closed: если rate limiter недоступен, блокируем запрос
    return { success: false, remaining: 0, reset: Date.now() + 60000 };
  }
}
