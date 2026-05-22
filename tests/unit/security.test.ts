import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { hasPermission } from "@/lib/auth/rbac";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { verifyCsrf } from "@/lib/http";
import { isPublicRoute } from "@/lib/auth/middleware-guards";

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

  it("denies all permissions for empty roles", () => {
    expect(hasPermission([], "courses:read")).toBe(false);
    expect(hasPermission([], "settings:manage")).toBe(false);
    expect(hasPermission([], "progress:write")).toBe(false);
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

describe("Rate Limiter — IP key isolation", () => {
  it("tracks separate buckets for different IPs", async () => {
    const ipA = await checkRateLimit("login:ip:10.0.0.1");
    const ipB = await checkRateLimit("login:ip:10.0.0.2");
    expect(ipA.allowed).toBe(true);
    expect(ipB.allowed).toBe(true);
  });

  it("exhausts one IP bucket without affecting another", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit("login:ip:10.0.0.10");
    }
    const blocked = await checkRateLimit("login:ip:10.0.0.10");
    expect(blocked.allowed).toBe(false);

    const other = await checkRateLimit("login:ip:10.0.0.20");
    expect(other.allowed).toBe(true);
    expect(other.remaining).toBe(4);
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

describe("Public asset middleware exemptions", () => {
  it("allows PWA assets without authentication", () => {
    expect(isPublicRoute("/sw.js")).toBe(true);
    expect(isPublicRoute("/manifest.json")).toBe(true);
    expect(isPublicRoute("/icon.svg")).toBe(true);
  });

  it("keeps the consent route public", () => {
    expect(isPublicRoute("/consent")).toBe(true);
  });
});

describe("Demo seed surface", () => {
  it("does not expose certificate issuance as an app route", () => {
    expect(existsSync("app/api/seed-certificate/route.ts")).toBe(false);
  });
});

describe("Client role error boundaries", () => {
  it("do not render the async app shell from client error boundaries", () => {
    const roleErrorBoundaries = [
      "app/admin/error.tsx",
      "app/instructor/error.tsx",
      "app/student/error.tsx",
      "app/curator/error.tsx",
      "app/super-curator/error.tsx",
      "app/customer-observer/error.tsx",
    ];

    for (const path of roleErrorBoundaries) {
      expect(readFileSync(path, "utf8")).not.toContain("@/components/layout/app-shell");
    }
  });
});
