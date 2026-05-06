import { describe, expect, it } from "vitest";
import { hasPermission } from "@/lib/auth/rbac";

describe("RBAC", () => {
  it("allows admin to manage settings", () => {
    expect(hasPermission(["admin"], "settings:manage")).toBe(true);
  });

  it("does not allow student to issue certificates", () => {
    expect(hasPermission(["student"], "certificates:issue")).toBe(false);
  });

  it("allows observer to read reports", () => {
    expect(hasPermission(["customer_observer"], "reports:read")).toBe(true);
  });
});

