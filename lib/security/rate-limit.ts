import { env } from "@/lib/env";

type Bucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, Bucket>();

export function checkRateLimit(key: string) {
  const now = Date.now();
  const windowMs = env.RATE_LIMIT_WINDOW_SECONDS * 1000;
  const bucket = memoryBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: env.RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (bucket.count >= env.RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true, remaining: env.RATE_LIMIT_MAX_REQUESTS - bucket.count, resetAt: bucket.resetAt };
}

