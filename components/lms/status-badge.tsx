import { Badge } from "@/components/ui/badge";

/**
 * Единая карта статусов для всего проекта.
 * Все цвета статусов определяются здесь и используются через `StatusBadge`.
 *
 * Цветовая схема:
 * - success (emerald) — COMPLETED, ACCEPTED, PUBLISHED, answered
 * - warning (amber) — IN_REVIEW, NEEDS_REVISION, DRAFT, forwarded
 * - danger (rose) — REJECTED, critical, PAUSED
 * - info (sky) — IN_PROGRESS, SUBMITTED, open
 * - neutral (gray) — NOT_STARTED, BLOCKED, ARCHIVED, low
 * - primary — required, active
 */

export type BadgeStatus =
  // Progress
  | "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" | "BLOCKED"
  // Submission
  | "SUBMITTED" | "ACCEPTED" | "REJECTED" | "NEEDS_REVISION" | "IN_REVIEW" | "DRAFT"
  // Course
  | "PUBLISHED" | "ARCHIVED"
  // Questions
  | "open" | "answered" | "forwarded"
  // Risks
  | "critical" | "high" | "medium" | "low"
  // Enrollment
  | "PAUSED" | "ACTIVE"
  // Quiz
  | "passed" | "failed"
  // Deadline
  | "overdue" | "upcoming";

interface StatusBadgeConfig {
  label: string;
  variant: "success" | "warning" | "danger" | "info" | "neutral" | "primary";
}

const STATUS_CONFIG: Record<BadgeStatus, StatusBadgeConfig> = {
  // Progress
  COMPLETED: { label: "Завершён", variant: "success" },
  IN_PROGRESS: { label: "В процессе", variant: "info" },
  NOT_STARTED: { label: "Не начат", variant: "neutral" },
  BLOCKED: { label: "Заблокирован", variant: "neutral" },
  // Submission
  SUBMITTED: { label: "Отправлено", variant: "info" },
  ACCEPTED: { label: "Зачтено", variant: "success" },
  REJECTED: { label: "Отклонено", variant: "danger" },
  NEEDS_REVISION: { label: "На доработку", variant: "warning" },
  IN_REVIEW: { label: "На проверке", variant: "warning" },
  DRAFT: { label: "Черновик", variant: "warning" },
  // Course
  PUBLISHED: { label: "Опубликован", variant: "success" },
  ARCHIVED: { label: "Архив", variant: "neutral" },
  // Questions
  open: { label: "Ожидает ответа", variant: "info" },
  answered: { label: "Отвечен", variant: "success" },
  forwarded: { label: "Передан", variant: "warning" },
  // Risks
  critical: { label: "Критический", variant: "danger" },
  high: { label: "Высокий", variant: "warning" },
  medium: { label: "Средний", variant: "warning" },
  low: { label: "Низкий", variant: "neutral" },
  // Enrollment
  PAUSED: { label: "Приостановлено", variant: "danger" },
  ACTIVE: { label: "Активен", variant: "primary" },
  // Quiz
  passed: { label: "Сдан", variant: "success" },
  failed: { label: "Не сдан", variant: "danger" },
  // Deadline
  overdue: { label: "Просрочен", variant: "danger" },
  upcoming: { label: "Дедлайн", variant: "warning" },
};

const DOT_COLORS: Record<string, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-sky-500",
  neutral: "bg-m3-outline",
  primary: "bg-m3-primary",
};

const VARIANT_CLASSES: Record<string, string> = {
  success:
    "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:border-emerald-500/15 dark:bg-emerald-500/10 dark:text-emerald-400",
  warning:
    "border-amber-500/20 bg-amber-500/8 text-amber-700 dark:border-amber-500/15 dark:bg-amber-500/10 dark:text-amber-400",
  danger:
    "border-rose-500/20 bg-rose-500/8 text-rose-700 dark:border-rose-500/15 dark:bg-rose-500/10 dark:text-rose-400",
  info:
    "border-sky-500/20 bg-sky-500/8 text-sky-700 dark:border-sky-500/15 dark:bg-sky-500/10 dark:text-sky-400",
  neutral:
    "border-m3-outline-variant/40 bg-m3-surface-container-high/50 text-m3-on-surface-variant",
  primary:
    "border-m3-primary/20 bg-m3-primary/8 text-m3-primary",
};

const PULSE_VARIANTS = new Set<BadgeStatus>(["ACTIVE", "open", "IN_PROGRESS"]);

export function StatusBadge({
  status,
  label,
  className = "",
  ...props
}: {
  status: BadgeStatus;
  /** Кастомный label вместо стандартного */
  label?: string;
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const config = STATUS_CONFIG[status];
  if (!config) {
    return (
      <Badge className={className} aria-label={`Статус: ${status}`} {...props}>
        {status}
      </Badge>
    );
  }

  const finalLabel = label ?? config.label;
  const ariaLabel = props["aria-label"] || `Статус: ${finalLabel}`;
  const shouldPulse = PULSE_VARIANTS.has(status);

  return (
    <Badge 
      className={`gap-1.5 ${VARIANT_CLASSES[config.variant]} ${className}`}
      aria-label={ariaLabel}
      {...props}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${DOT_COLORS[config.variant]} ${shouldPulse ? "animate-glow-pulse" : ""}`} />
      {finalLabel}
    </Badge>
  );
}

/** Для случаев, когда нужна только карта label → variant (без рендеринга) */
export function getBadgeVariant(status: BadgeStatus): "success" | "warning" | "danger" | "info" | "neutral" | "primary" {
  return STATUS_CONFIG[status]?.variant ?? "neutral";
}
