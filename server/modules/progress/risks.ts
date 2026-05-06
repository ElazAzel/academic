export type LearnerRiskInput = {
  lastLoginAt?: Date | null;
  lastLearningAt?: Date | null;
  moduleDueAt?: Date | null;
  moduleProgressPercent: number;
  courseProgressPercent: number;
  finalAssignmentAccepted: boolean;
  now?: Date;
};

export type LearnerRisk = {
  type: "inactive_login" | "inactive_learning" | "module_at_risk" | "module_overdue" | "certificate_at_risk";
  severity: "low" | "medium" | "high";
  title: string;
};

const dayMs = 24 * 60 * 60 * 1000;

function daysBetween(now: Date, value?: Date | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.floor((now.getTime() - value.getTime()) / dayMs);
}

export function detectLearnerRisks(input: LearnerRiskInput): LearnerRisk[] {
  const now = input.now ?? new Date();
  const risks: LearnerRisk[] = [];

  if (daysBetween(now, input.lastLoginAt) > 3) {
    risks.push({ type: "inactive_login", severity: "medium", title: "Давно не заходил" });
  }

  if (daysBetween(now, input.lastLearningAt) > 3) {
    risks.push({ type: "inactive_learning", severity: "medium", title: "Нет учебной активности" });
  }

  if (input.moduleDueAt) {
    const daysToDue = Math.ceil((input.moduleDueAt.getTime() - now.getTime()) / dayMs);
    if (daysToDue < 0 && input.moduleProgressPercent < 100) {
      risks.push({ type: "module_overdue", severity: "high", title: "Модуль просрочен" });
    } else if (daysToDue <= 2 && input.moduleProgressPercent < 70) {
      risks.push({ type: "module_at_risk", severity: "medium", title: "Не успевает пройти модуль" });
    }
  }

  if (input.courseProgressPercent < 85 || !input.finalAssignmentAccepted) {
    risks.push({ type: "certificate_at_risk", severity: "high", title: "Сертификат под угрозой" });
  }

  return risks;
}

