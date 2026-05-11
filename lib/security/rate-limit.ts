import { env } from "@/lib/env";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

let redisClient: import("ioredis").Redis | null = null;

async function getRedis(): Promise<import("ioredis").Redis | null> {
  if (redisClient) return redisClient;
  if (!env.REDIS_URL) return null;
  try {
    const { Redis } = await import("ioredis");
    redisClient = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await redisClient.connect();
    return redisClient;
  } catch {
    return null;
  }
}

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  const windowMs = env.RATE_LIMIT_WINDOW_SECONDS * 1000;
  const maxRequests = env.RATE_LIMIT_MAX_REQUESTS;
  const now = Date.now();

  const redis = await getRedis();
  if (redis) {
    try {
      const windowKey = Math.floor(now / windowMs).toString();
      const redisKey = `rate_limit:${key}:${windowKey}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.pexpire(redisKey, windowMs);
      }
      const allowed = count <= maxRequests;
      return {
        allowed,
        remaining: Math.max(0, maxRequests - count),
        resetAt: now + windowMs
      };
    } catch {
      // fallback to memory on Redis error
    }
  }

  const bucket = memoryBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true, remaining: maxRequests - bucket.count, resetAt: bucket.resetAt };
}
