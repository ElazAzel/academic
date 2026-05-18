import { describe, expect, it } from "vitest";
import { getActiveNavHref, NAV_BY_ROLE } from "@/components/layout/navigation";

describe("getActiveNavHref", () => {
  it("selects the most specific student route instead of the dashboard parent", () => {
    expect(getActiveNavHref("/student/certificates", NAV_BY_ROLE.student)).toBe("/student/certificates");
    expect(getActiveNavHref("/student/certificates/abc", NAV_BY_ROLE.student)).toBe("/student/certificates");
  });

  it("keeps the dashboard active only on the exact role root", () => {
    expect(getActiveNavHref("/student", NAV_BY_ROLE.student)).toBe("/student");
    expect(getActiveNavHref("/curator/students", NAV_BY_ROLE.curator)).toBe("/curator/students");
    expect(getActiveNavHref("/super-curator/curators/123", NAV_BY_ROLE.super_curator)).toBe("/super-curator/curators");
  });
});
