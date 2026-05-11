import { describe, expect, it, vi } from "vitest";
import { hasPermission } from "@/lib/auth/rbac";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { verifyCsrf } from "@/lib/http";

vi.mock("@/lib/env", () => ({
  env: {
    RATE_LIMIT_WINDOW_SECONDS: 60,
    RATE_LIMIT_MAX_REQUESTS: 5,
    REDIS_URL: undefined
  }
}));

describe("RBAC", () => {
  it("admin has all permissions", () => {
    const allPermissions = [
      "users:read", "users:write", "roles:manage",
      "courses:read", "courses:write", "lessons:write",
      "enrollments:write", "progress:write", "quizzes:write",
      "assignments:review", "certificates:issue", "invites:manage",
      "analytics:read", "audit:read", "settings:manage",
      "notifications:write", "reports:read"
    ] as const;
    for (const perm of allPermissions) {
      expect(hasPermission(["admin"], perm)).toBe(true);
    }
  });

  it("student has limited permissions", () => {
    expect(hasPermission(["student"], "courses:read")).toBe(true);
    expect(hasPermission(["student"], "progress:write")).toBe(true);
    expect(hasPermission(["student"], "certificates:issue")).toBe(false);
    expect(hasPermission(["student"], "settings:manage")).toBe(false);
    expect(hasPermission(["student"], "users:write")).toBe(false);
  });

  it("curator has review permissions", () => {
    expect(hasPermission(["curator"], "assignments:review")).toBe(true);
    expect(hasPermission(["curator"], "notifications:write")).toBe(true);
    expect(hasPermission(["curator"], "certificates:issue")).toBe(false);
  });

  it("customer_observer has read-only permissions", () => {
    expect(hasPermission(["customer_observer"], "courses:read")).toBe(true);
    expect(hasPermission(["customer_observer"], "analytics:read")).toBe(true);
    expect(hasPermission(["customer_observer"], "reports:read")).toBe(true);
    expect(hasPermission(["customer_observer"], "users:write")).toBe(false);
  });

  it("super_curator has user management permissions", () => {
    expect(hasPermission(["super_curator"], "users:read")).toBe(true);
    expect(hasPermission(["super_curator"], "users:write")).toBe(true);
    expect(hasPermission(["super_curator"], "assignments:review")).toBe(true);
    expect(hasPermission(["super_curator"], "settings:manage")).toBe(false);
  });

  it("returns false for unknown permission", () => {
    expect(hasPermission(["student"], "settings:manage")).toBe(false);
  });

  it("defaults to student permissions for empty roles", () => {
    expect(hasPermission([], "courses:read")).toBe(true);
    expect(hasPermission([], "settings:manage")).toBe(false);
  });
});

describe("Rate Limiter", () => {
  it("allows first request", async () => {
    const result = await checkRateLimit("test-key-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks after max requests", async () => {
    const key = "test-key-2";
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(key);
      expect(result.allowed).toBe(true);
    }
    const blocked = await checkRateLimit(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after window expires", async () => {
    const key = "test-key-3";
    vi.useFakeTimers();
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(key);
    }
    const blocked = await checkRateLimit(key);
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(61_000);
    const reset = await checkRateLimit(key);
    expect(reset.allowed).toBe(true);
    expect(reset.remaining).toBe(4);
    vi.useRealTimers();
  });
});

describe("CSRF verification", () => {
  it("allows same-origin requests", () => {
    const request = new Request("http://localhost:3000/api/v1/test", {
      headers: { origin: "http://localhost:3000" }
    });
    expect(() => verifyCsrf(request)).not.toThrow();
  });

  it("blocks cross-origin requests", () => {
    const request = new Request("http://localhost:3000/api/v1/test", {
      headers: { origin: "https://evil-site.com" }
    });
    expect(() => verifyCsrf(request)).toThrow();
  });

  it("blocks requests without origin header", () => {
    const request = new Request("http://localhost:3000/api/v1/test");
    expect(() => verifyCsrf(request)).toThrow();
  });

  it("allows same-origin via referer", () => {
    const request = new Request("http://localhost:3000/api/v1/test", {
      headers: { referer: "http://localhost:3000/login" }
    });
    expect(() => verifyCsrf(request)).not.toThrow();
  });
});
