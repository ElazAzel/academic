import { describe, expect, it } from "vitest";
import { existsSync } from "fs";
import path from "path";
import { BOTTOM_NAV_BY_ROLE, getActiveNavHref, NAV_BY_ROLE } from "@/components/layout/navigation";

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

  it("keeps the deprecated student reports surface removed from navigation and routes", () => {
    expect(NAV_BY_ROLE.student.map((item) => item.href)).not.toContain("/student/reports");
    expect(BOTTOM_NAV_BY_ROLE.student.map((item) => item.href)).not.toContain("/student/reports");
    expect(existsSync(path.join(process.cwd(), "app", "student", "reports", "page.tsx"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "app", "student", "reports", "loading.tsx"))).toBe(false);
  });
});
