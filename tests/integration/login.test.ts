import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/\[...nextauth\]/route";
import * as rateLimitModule from "@/lib/security/rate-limit";

vi.mock("next-auth", () => ({
  default: vi.fn(() => vi.fn(() => new Response(null, { status: 200 }))),
}));

vi.mock("@/server/auth/options", () => ({
  authOptions: {},
}));

describe("credentials login POST", () => {
  it("allows request when under rate limit", async () => {
    vi.spyOn(rateLimitModule, "checkRateLimit").mockResolvedValueOnce({
      allowed: true, remaining: 119, resetAt: Date.now() + 60_000,
    });

    const request = new Request("http://localhost:3000/api/auth/signin", {
      method: "POST",
      headers: { "x-forwarded-for": "127.0.0.1" },
    });

    const response = await POST(request, { params: { nextauth: ["signin"] } });
    expect(response.status).toBe(200);
  });

  it("returns 429 when IP is rate limited", async () => {
    vi.spyOn(rateLimitModule, "checkRateLimit").mockResolvedValueOnce({
      allowed: false, remaining: 0, resetAt: Date.now() + 60_000,
    });

    const request = new Request("http://localhost:3000/api/auth/signin", {
      method: "POST",
      headers: { "x-forwarded-for": "10.0.0.1" },
    });

    const response = await POST(request, { params: { nextauth: ["signin"] } });
    expect(response.status).toBe(429);

    const payload = await response.json();
    expect(payload.error).toBeDefined();
  });

  it("fallbacks to 'unknown' when no IP headers are present", async () => {
    const spy = vi.spyOn(rateLimitModule, "checkRateLimit").mockResolvedValueOnce({
      allowed: true, remaining: 119, resetAt: Date.now() + 60_000,
    });

    const request = new Request("http://localhost:3000/api/auth/signin", {
      method: "POST",
    });

    await POST(request, { params: { nextauth: ["signin"] } });
    expect(spy).toHaveBeenCalledWith("login:ip:unknown");
  });
});
