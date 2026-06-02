import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockVerifyPassword = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockGetToken = vi.hoisted(() => vi.fn());
const mockEncode = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockVerifyTotp = vi.hoisted(() => vi.fn());
const mockVerifyAndConsumeBackupCode = vi.hoisted(() => vi.fn());
const mockEnable2fa = vi.hoisted(() => vi.fn());
const mockDisable2fa = vi.hoisted(() => vi.fn());
const mockIs2faEnabled = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/auth/password", () => ({ verifyPassword: mockVerifyPassword }));
vi.mock("@/lib/security/rate-limit", () => ({ checkRateLimit: mockCheckRateLimit }));
vi.mock("next-auth/jwt", () => ({
  getToken: mockGetToken,
  encode: mockEncode,
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: { findUnique: mockUserFindUnique },
  }),
}));
vi.mock("@/server/modules/2fa/service", () => ({
  verifyTotp: mockVerifyTotp,
  verifyAndConsumeBackupCode: mockVerifyAndConsumeBackupCode,
  enable2fa: mockEnable2fa,
  disable2fa: mockDisable2fa,
  is2faEnabled: mockIs2faEnabled,
}));

const verifyLoginRoute = await import("@/app/api/v1/auth/2fa/verify-login/route");
const verifyRoute = await import("@/app/api/v1/auth/2fa/verify/route");
const disableRoute = await import("@/app/api/v1/auth/2fa/disable/route");
const statusRoute = await import("@/app/api/v1/auth/2fa/status/route");

function jsonRequest(body: unknown, url = "http://localhost/api/v1/auth/2fa/verify-login") {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "next-auth.session-token=old-token",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_SECRET = "test-secret";
  mockRequireUser.mockResolvedValue({ id: "user-1", email: "user@example.com", roles: ["student"] });
  mockVerifyPassword.mockResolvedValue(true);
  mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 4, resetAt: Date.now() + 60000 });
  mockGetToken.mockResolvedValue({ sub: "user-1", requires2fa: true });
  mockEncode.mockResolvedValue("new-session-token");
  mockUserFindUnique.mockResolvedValue({ totpSecret: "totp-secret", passwordHash: "hashed-password" });
  mockVerifyTotp.mockReturnValue(true);
  mockVerifyAndConsumeBackupCode.mockResolvedValue(true);
  mockEnable2fa.mockResolvedValue({ backupCodes: ["ABCD1234"] });
  mockDisable2fa.mockResolvedValue(undefined);
  mockIs2faEnabled.mockResolvedValue(true);
});

describe("2FA login verification route", () => {
  it("requires an authenticated 2FA login token before rate limiting", async () => {
    mockGetToken.mockResolvedValue(null);

    const response = await verifyLoginRoute.POST(jsonRequest({ token: "123456" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("rate limits login code attempts per authenticated user", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const response = await verifyLoginRoute.POST(jsonRequest({ token: "123456" }));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe("too_many_requests");
    expect(mockCheckRateLimit).toHaveBeenCalledWith("2fa-login:user-1");
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("validates the request body before checking a code", async () => {
    const response = await verifyLoginRoute.POST(jsonRequest({}));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockVerifyAndConsumeBackupCode).not.toHaveBeenCalled();
  });

  it("verifies TOTP and refreshes the session cookie without the 2FA flag", async () => {
    const response = await verifyLoginRoute.POST(jsonRequest({ token: "123456" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { totpSecret: true },
    });
    expect(mockVerifyTotp).toHaveBeenCalledWith("123456", "totp-secret");
    expect(mockEncode).toHaveBeenCalledWith({
      token: expect.objectContaining({ sub: "user-1", requires2fa: false }),
      secret: "test-secret",
    });
    expect(response.headers.get("set-cookie")).toContain("next-auth.session-token=new-session-token");
  });

  it("uses a backup code without reading the TOTP secret", async () => {
    const response = await verifyLoginRoute.POST(jsonRequest({ backupCode: "ABCD1234" }));

    expect(response.status).toBe(200);
    expect(mockVerifyAndConsumeBackupCode).toHaveBeenCalledWith("user-1", "ABCD1234");
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockEncode).toHaveBeenCalled();
  });

  it("does not refresh the session when the code is invalid", async () => {
    mockVerifyTotp.mockReturnValue(false);

    const response = await verifyLoginRoute.POST(jsonRequest({ token: "000000" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("bad_request");
    expect(mockEncode).not.toHaveBeenCalled();
  });
});

describe("2FA setup verification route", () => {
  it("rate limits setup verification attempts before enabling 2FA", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const response = await verifyRoute.POST(
      jsonRequest({ secret: "totp-secret", token: "123456" }, "http://localhost/api/v1/auth/2fa/verify"),
    );

    expect(response.status).toBe(429);
    expect(mockVerifyTotp).not.toHaveBeenCalled();
    expect(mockEnable2fa).not.toHaveBeenCalled();
  });

  it("rejects an incomplete setup verification payload", async () => {
    const response = await verifyRoute.POST(jsonRequest({}, "http://localhost/api/v1/auth/2fa/verify"));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(mockVerifyTotp).not.toHaveBeenCalled();
    expect(mockEnable2fa).not.toHaveBeenCalled();
  });

  it("enables 2FA after a valid setup code", async () => {
    const response = await verifyRoute.POST(
      jsonRequest({ secret: "totp-secret", token: "123456" }, "http://localhost/api/v1/auth/2fa/verify"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.backupCodes).toEqual(["ABCD1234"]);
    expect(mockVerifyTotp).toHaveBeenCalledWith("123456", "totp-secret");
    expect(mockEnable2fa).toHaveBeenCalledWith("user-1", "totp-secret");
  });
});

describe("2FA disable route", () => {
  it("rejects an empty password payload before reading the user password hash", async () => {
    const response = await disableRoute.POST(jsonRequest({}, "http://localhost/api/v1/auth/2fa/disable"));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockDisable2fa).not.toHaveBeenCalled();
  });

  it("does not disable 2FA when the password is wrong", async () => {
    mockVerifyPassword.mockResolvedValue(false);

    const response = await disableRoute.POST(
      jsonRequest({ password: "wrong-password" }, "http://localhost/api/v1/auth/2fa/disable"),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockDisable2fa).not.toHaveBeenCalled();
  });

  it("disables 2FA after a valid password", async () => {
    const response = await disableRoute.POST(
      jsonRequest({ password: "current-password" }, "http://localhost/api/v1/auth/2fa/disable"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(mockVerifyPassword).toHaveBeenCalledWith("hashed-password", "current-password");
    expect(mockDisable2fa).toHaveBeenCalledWith("user-1");
  });
});

describe("2FA status route", () => {
  it("returns structured auth errors instead of a plain response body", async () => {
    mockRequireUser.mockRejectedValue(new ApiError("unauthorized", "Требуется вход", 401));

    const response = await statusRoute.GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
    expect(mockIs2faEnabled).not.toHaveBeenCalled();
  });
});
