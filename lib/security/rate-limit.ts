import { env } from "@/lib/env";

type Bucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, Bucket>();

export function checkRateLimit(key: string) {
  const windowMs = env.RATE_LIMIT_WINDOW_SECONDS * 1000;
  const maxRequests = env.RATE_LIMIT_MAX_REQUESTS;

  const now = Date.now();
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
