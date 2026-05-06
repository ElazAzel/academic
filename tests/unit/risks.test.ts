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
      finalAssignmentAccepted: false
    });
    expect(risks.map((risk) => risk.type)).toEqual([
      "inactive_login",
      "inactive_learning",
      "module_overdue",
      "certificate_at_risk"
    ]);
  });
});

