import { describe, expect, it } from "vitest";
import { detectLearnerRisks } from "@/server/modules/progress/risks";

describe("learner risk detection", () => {
  it("detects inactivity and certificate risk", () => {
    const now = new Date("2026-05-07T00:00:00Z");
    const risks = detectLearnerRisks({
      now,
      lastLoginAt: new Date("2026-05-01T00:00:00Z"),
      lastLearningAt: new Date("2026-05-01T00:00:00Z"),
      moduleDueAt: new Date("2026-05-06T00:00:00Z"),
      moduleProgressPercent: 50,
      courseProgressPercent: 40,
      finalAssignmentAccepted: false,
    });
    expect(risks.map((risk) => risk.type)).toEqual([
      "inactive_login",
      "inactive_learning",
      "module_overdue",
      "certificate_at_risk",
    ]);
  });

  it("does not flag certificate risk when courseProgress meets default threshold", () => {
    const risks = detectLearnerRisks({
      courseProgressPercent: 90,
      moduleProgressPercent: 100,
      finalAssignmentAccepted: true,
    });
    expect(risks.find((r) => r.type === "certificate_at_risk")).toBeUndefined();
  });

  it("uses custom completionThreshold when provided", () => {
    // Below custom threshold of 90, but above default 85 — should flag
    const risks = detectLearnerRisks({
      courseProgressPercent: 87,
      moduleProgressPercent: 100,
      finalAssignmentAccepted: true,
      completionThreshold: 90,
    });
    expect(risks.map((r) => r.type)).toContain("certificate_at_risk");
  });

  it("does not flag certificate risk when above custom threshold", () => {
    const risks = detectLearnerRisks({
      courseProgressPercent: 95,
      moduleProgressPercent: 100,
      finalAssignmentAccepted: true,
      completionThreshold: 90,
    });
    expect(risks.find((r) => r.type === "certificate_at_risk")).toBeUndefined();
  });

  it("flags certificate risk when finalAssignment not accepted even with high progress", () => {
    const risks = detectLearnerRisks({
      courseProgressPercent: 100,
      moduleProgressPercent: 100,
      finalAssignmentAccepted: false,
    });
    expect(risks.map((r) => r.type)).toContain("certificate_at_risk");
  });

  it("detects module overdue", () => {
    const risks = detectLearnerRisks({
      now: new Date("2026-05-10T00:00:00Z"),
      moduleDueAt: new Date("2026-05-05T00:00:00Z"),
      moduleProgressPercent: 50,
      courseProgressPercent: 50,
      finalAssignmentAccepted: false,
    });
    expect(risks.map((r) => r.type)).toContain("module_overdue");
  });

  it("detects module at risk when near deadline", () => {
    const risks = detectLearnerRisks({
      now: new Date("2026-05-07T00:00:00Z"),
      moduleDueAt: new Date("2026-05-08T00:00:00Z"),
      moduleProgressPercent: 50,
      courseProgressPercent: 50,
      finalAssignmentAccepted: false,
    });
    expect(risks.map((r) => r.type)).toContain("module_at_risk");
  });

  it("returns no risks when all conditions are met", () => {
    const now = new Date("2026-05-07T00:00:00Z");
    const risks = detectLearnerRisks({
      now,
      lastLoginAt: new Date("2026-05-06T00:00:00Z"),
      lastLearningAt: new Date("2026-05-06T00:00:00Z"),
      moduleDueAt: new Date("2026-05-20T00:00:00Z"),
      moduleProgressPercent: 100,
      courseProgressPercent: 100,
      finalAssignmentAccepted: true,
    });
    expect(risks).toHaveLength(0);
  });
});
