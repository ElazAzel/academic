import { describe, expect, it } from "vitest";
import { UserAccountStatus } from "@prisma/client";
import { isActiveUserStatus } from "@/lib/auth/user-status";

describe("user status normalization", () => {
  it("accepts active status", () => {
    expect(isActiveUserStatus(UserAccountStatus.ACTIVE)).toBe(true);
  });

  it("rejects inactive or missing statuses", () => {
    expect(isActiveUserStatus(UserAccountStatus.INACTIVE)).toBe(false);
    expect(isActiveUserStatus(UserAccountStatus.BLOCKED)).toBe(false);
    expect(isActiveUserStatus(UserAccountStatus.DELETED)).toBe(false);
    expect(isActiveUserStatus(null)).toBe(false);
    expect(isActiveUserStatus(undefined)).toBe(false);
  });
});
