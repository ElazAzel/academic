import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Simple in-memory rate limiter for Edge middleware.
 * In production with multiple Vercel instances, each instance has its own counter.
 * For strict rate limiting, use @upstash/ratelimit with Vercel KV.
 */
const rateMap = new Map<string, { count: number; resetAt: number }>();

function getRateLimitInfo(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 120;

  const entry = rateMap.get(key);
  if (!entry || entry.resetAt <= now) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate-limit API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "anonymous";

  const key = `${ip}:${pathname}`;
  const { allowed, remaining } = getRateLimitInfo(key);

  const response = allowed
    ? NextResponse.next()
    : NextResponse.json(
        { error: { code: "too_many_requests", message: "Слишком много запросов. Попробуйте позже." } },
        { status: 429 }
      );

  response.headers.set("X-RateLimit-Limit", "120");
  response.headers.set("X-RateLimit-Remaining", String(remaining));

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
