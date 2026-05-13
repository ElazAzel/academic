import { describe, expect, it } from "vitest";
import { isActiveUserStatus } from "@/lib/auth/user-status";

describe("user status normalization", () => {
  it("accepts active status regardless of case", () => {
    expect(isActiveUserStatus("active")).toBe(true);
    expect(isActiveUserStatus("ACTIVE")).toBe(true);
    expect(isActiveUserStatus("Active")).toBe(true);
    expect(isActiveUserStatus(" active ")).toBe(true);
  });

  it("rejects inactive or missing statuses", () => {
    expect(isActiveUserStatus("inactive")).toBe(false);
    expect(isActiveUserStatus("blocked")).toBe(false);
    expect(isActiveUserStatus(null)).toBe(false);
    expect(isActiveUserStatus(undefined)).toBe(false);
  });
});
