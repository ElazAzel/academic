import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  agentRoles,
  getReleaseReadinessSummary,
  productRoles,
  projectSkills,
  releaseGates,
  releaseHardeningContractVersion,
  releaseWorkPackages,
  roleRedirectPriority,
  technicalSkills,
  type ProjectSkillId,
} from "@/server/modules/release-hardening/readiness";

const root = process.cwd();

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    return statSync(fullPath).isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

const projectSkillPaths: Record<ProjectSkillId, string> = {
  "lms-domain-rules": "skills/shared/lms-domain-rules/SKILL.md",
  "lms-implementation": "skills/codex/lms-implementation/SKILL.md",
  "lms-qa-release": "skills/codex/lms-qa-release/SKILL.md",
  "lms-orchestrator": "skills/antigravity/lms-orchestrator/SKILL.md",
  "multi-agent-review": "skills/antigravity/multi-agent-review/SKILL.md",
};

describe("release hardening readiness contract", () => {
  it("keeps the six product roles and redirect priority explicit", () => {
    expect(productRoles).toEqual([
      "admin",
      "instructor",
      "student",
      "curator",
      "super_curator",
      "customer_observer",
    ]);

    expect(roleRedirectPriority).toEqual([
      "admin",
      "super_curator",
      "curator",
      "instructor",
      "customer_observer",
      "student",
    ]);
  });

  it("keeps all AI agent role files represented", () => {
    expect(agentRoles).toHaveLength(10);

    for (const role of agentRoles) {
      expect(existsSync(path.join(root, "ai", "roles", `${role}.md`)), role).toBe(true);
    }
  });

  it("keeps project skills and installed technical skills in sync with the workspace", () => {
    expect(projectSkills).toHaveLength(5);

    for (const skill of projectSkills) {
      expect(existsSync(path.join(root, projectSkillPaths[skill])), skill).toBe(true);
    }

    const lock = JSON.parse(readFileSync(path.join(root, "skills-lock.json"), "utf8")) as {
      skills: Record<string, unknown>;
    };

    expect(Object.keys(lock.skills).sort()).toEqual([...technicalSkills].sort());

    for (const skill of technicalSkills) {
      expect(existsSync(path.join(root, ".agents", "skills", skill, "SKILL.md")), skill).toBe(true);
    }
  });

  it("keeps Prisma Client out of App Router pages and UI components", () => {
    const files = [
      ...listFiles(path.join(root, "app")).filter((file) => file.endsWith(`${path.sep}page.tsx`)),
      ...listFiles(path.join(root, "components")).filter((file) => file.endsWith(".tsx")),
    ];

    const offenders = files
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        return source.includes("@/lib/prisma") || /\bgetPrisma\s*\(/.test(source) || /\bprisma\./.test(source);
      })
      .map((file) => path.relative(root, file).replaceAll(path.sep, "/"));

    expect(offenders).toEqual([]);
  });

  it("tracks all seven release hardening work packages with owners and evidence", () => {
    expect(releaseHardeningContractVersion).toBe("2026-05-26");
    expect(releaseWorkPackages.map((workPackage) => workPackage.id)).toEqual([
      "WP0",
      "WP1",
      "WP2",
      "WP3",
      "WP4",
      "WP5",
      "WP6",
    ]);

    for (const workPackage of releaseWorkPackages) {
      expect(workPackage.owners.length, workPackage.id).toBeGreaterThan(0);
      expect(workPackage.exitCriteria.length, workPackage.id).toBeGreaterThan(0);
      expect(workPackage.evidence.length, workPackage.id).toBeGreaterThan(0);
      expect(workPackage.evidence.some((item) => item.requiredForDone), workPackage.id).toBe(true);
    }
  });

  it("marks the platform release-ready when all scenario and ops proof are complete", () => {
    const summary = getReleaseReadinessSummary();

    expect(summary.isReleaseReady).toBe(true);
    expect(summary.status).toBe("done");
    expect(summary.incompletePackageIds).toEqual([]);
    expect(summary.blockedPackageIds).toEqual([]);
    expect(summary.incompleteGateIds).toEqual([]);
  });

  it("maps scenario, privacy and operations packages to the required roles and gates", () => {
    const wp1 = releaseWorkPackages.find((workPackage) => workPackage.id === "WP1");
    const wp2 = releaseWorkPackages.find((workPackage) => workPackage.id === "WP2");
    const wp6 = releaseWorkPackages.find((workPackage) => workPackage.id === "WP6");

    expect(wp1?.productRoles).toEqual([...productRoles]);
    expect(wp1?.evidence.some((item) => item.kind === "e2e" && item.requiredForDone)).toBe(true);

    expect(wp2?.scope.join(" ")).toContain("Guessed IDs");
    expect(wp2?.scope.join(" ")).toContain("Customer observer");
    expect(wp2?.exitCriteria.join(" ")).toContain("Email is sent only");

    expect(wp6?.status).toBe("done");
    expect(releaseGates.find((gate) => gate.id === "operational-release-drill")?.status).toBe("done");
  });
});
