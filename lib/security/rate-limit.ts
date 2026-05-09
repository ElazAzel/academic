import { env } from "@/lib/env";
import { Redis } from "ioredis";

type Bucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, Bucket>();

let redisClient: Redis | null = null;
if (env.REDIS_URL) {
  redisClient = new Redis(env.REDIS_URL);
}

export async function checkRateLimit(key: string) {
  const windowMs = env.RATE_LIMIT_WINDOW_SECONDS * 1000;
  const maxRequests = env.RATE_LIMIT_MAX_REQUESTS;

  if (redisClient) {
    const redisKey = `rate-limit:${key}`;
    const now = Date.now();

    // Multi/exec block to ensure atomic operations
    // 1. Increment the count
    // 2. Get the TTL
    const results = await redisClient
      .multi()
      .incr(redisKey)
      .pttl(redisKey)
      .exec();

    if (!results) {
      // Fallback if transaction fails
      return { allowed: true, remaining: maxRequests - 1 };
    }

    const count = results[0][1] as number;
    let ttl = results[1][1] as number;

    // If key has no expiration (-1), set it
    if (ttl === -1 || count === 1) {
      await redisClient.pexpire(redisKey, windowMs);
      ttl = windowMs;
    }

    const resetAt = now + ttl;

    if (count > maxRequests) {
      return { allowed: false, remaining: 0, resetAt };
    }

    return { allowed: true, remaining: maxRequests - count, resetAt };
  }

  // Fallback to memory
  const now = Date.now();
  const bucket = memoryBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (bucket.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true, remaining: maxRequests - bucket.count, resetAt: bucket.resetAt };
}

