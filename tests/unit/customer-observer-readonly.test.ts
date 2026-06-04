import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { BOTTOM_NAV_BY_ROLE, NAV_BY_ROLE } from "@/components/layout/navigation";
import { hasPermission, permissions, rolePermissions, type Permission } from "@/lib/auth/rbac";

const OBSERVER_ALLOWED_PERMISSIONS = new Set<Permission>([
  "courses:read",
  "certificates:read",
  "analytics:read",
  "reports:read",
]);

const OBSERVER_APP_DIR = path.join(process.cwd(), "app", "customer-observer");

function collectTsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectTsxFiles(fullPath);
    }
    return entry.isFile() && fullPath.endsWith(".tsx") ? [fullPath] : [];
  });
}

const FORBIDDEN_OBSERVER_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /@\/components\/admin\/certificates-dashboard|CertificatesDashboard/u,
    reason: "certificate issue/revoke dashboard",
  },
  {
    pattern: /certificates\/designer|issueCertificate|revokeCertificate|certificateIssueSchema|certificateRevokeSchema/u,
    reason: "certificate mutation surface",
  },
  {
    pattern: /@\/server\/actions\/(?:admin|courses|lessons|quizzes|assignments|certificates|cohorts|invites|popups|notifications)\b/u,
    reason: "academy mutation server action",
  },
  {
    pattern: /method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/u,
    reason: "direct mutating API call",
  },
  {
    pattern: /href\s*=\s*["']\/(?:admin|instructor|curator|super-curator|student)(?:\/|["'])/u,
    reason: "cross-role navigation",
  },
];

describe("customer observer read-only contract", () => {
  it("keeps customer observer RBAC limited to read permissions", () => {
    expect(rolePermissions.customer_observer).toEqual([...OBSERVER_ALLOWED_PERMISSIONS]);

    for (const permission of permissions) {
      expect(hasPermission(["customer_observer"], permission)).toBe(OBSERVER_ALLOWED_PERMISSIONS.has(permission));
    }
  });

  it("keeps customer observer navigation inside the observer workspace", () => {
    const links = [...NAV_BY_ROLE.customer_observer, ...BOTTOM_NAV_BY_ROLE.customer_observer];

    for (const link of links) {
      expect(link.href).toMatch(/^\/customer-observer(?:\/|$)/u);
      expect(link.href).not.toMatch(/^\/(?:admin|instructor|curator|super-curator|student)(?:\/|$)/u);
    }
  });

  it("does not expose academy mutation affordances in customer observer pages", () => {
    const files = collectTsxFiles(OBSERVER_APP_DIR);

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const relativeFile = path.relative(process.cwd(), file);

      for (const { pattern, reason } of FORBIDDEN_OBSERVER_PATTERNS) {
        expect(source, `${relativeFile} exposes ${reason}`).not.toMatch(pattern);
      }
    }
  });

  it("keeps customer observer settings limited to account self-service actions", () => {
    const source = readFileSync(path.join(OBSERVER_APP_DIR, "settings", "page.tsx"), "utf8");

    expect(source).toContain("@/server/actions/settings");
    expect(source).toContain("updateProfileSettingsAction");
    expect(source).toContain("updatePasswordAction");
    expect(source).toContain("updateNotificationPreferencesAction");
    expect(source).not.toMatch(/getAppSettingsAction|updateAppSettingsAction|incrementBuildVersionAction/u);
  });
});
