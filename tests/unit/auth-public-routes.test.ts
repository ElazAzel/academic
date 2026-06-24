import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockVerifyEmail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/security/rate-limit", () => ({ checkRateLimit: mockCheckRateLimit }));
vi.mock("@/server/modules/auth/service", () => ({ verifyEmail: mockVerifyEmail }));

const forgotPasswordRoute = await import("@/app/api/v1/auth/forgot-password/route");
const resetPasswordRoute = await import("@/app/api/v1/auth/reset-password/route");
const verifyEmailRoute = await import("@/app/api/v1/auth/verify-email/route");

function jsonRequest(body: unknown, url = "http://localhost/api/v1/auth/verify-email") {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function verifyEmailRateLimitKey(token: string) {
  const digest = createHash("sha256").update(token).digest("hex").slice(0, 24);
  return `verify-email:${digest}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 4, resetAt: Date.now() + 60000 });
  mockVerifyEmail.mockResolvedValue({ ok: true });
});

describe("closed public password reset routes", () => {
  it("keeps forgot-password self-service disabled", async () => {
    const response = await forgotPasswordRoute.POST();
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.error.code).toBe("gone");
    expect(body.error.message).toContain("Самостоятельный сброс пароля отключён");
  }, 10_000);

  it("keeps reset-password self-service disabled", async () => {
    const response = await resetPasswordRoute.POST();
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.error.code).toBe("gone");
    expect(body.error.message).toContain("Самостоятельный сброс пароля отключён");
  }, 10_000);
});

describe("email verification route", () => {
  it("validates the token before rate limiting", async () => {
    const response = await verifyEmailRoute.POST(jsonRequest({ token: "" }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockVerifyEmail).not.toHaveBeenCalled();
  });

  it("rate limits email verification by token hash instead of one global bucket", async () => {
    const response = await verifyEmailRoute.POST(jsonRequest({ token: "email-token-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ ok: true });
    expect(mockCheckRateLimit).toHaveBeenCalledWith(verifyEmailRateLimitKey("email-token-1"));
    expect(mockCheckRateLimit).not.toHaveBeenCalledWith("verify-email");
    expect(mockVerifyEmail).toHaveBeenCalledWith("email-token-1");
  });

  it("does not consume the verification token when the scoped bucket is rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const response = await verifyEmailRoute.POST(jsonRequest({ token: "email-token-2" }));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe("too_many_requests");
    expect(mockCheckRateLimit).toHaveBeenCalledWith(verifyEmailRateLimitKey("email-token-2"));
    expect(mockVerifyEmail).not.toHaveBeenCalled();
  });
});
