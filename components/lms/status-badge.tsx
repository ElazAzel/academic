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

const VARIANT_CLASSES: Record<string, string> = {
  success:
    "border-m3-tertiary-fixed-dim/60 bg-m3-tertiary-fixed text-m3-tertiary dark:border-m3-tertiary-fixed-dim dark:bg-m3-tertiary-container dark:text-m3-tertiary-dark",
  warning:
    "border-m3-secondary-fixed-dim/60 bg-m3-secondary-fixed text-m3-secondary dark:border-m3-secondary-fixed-dim dark:bg-m3-secondary-container dark:text-m3-secondary-dark",
  danger:
    "border-m3-error-fixed-dim/60 bg-m3-error-fixed text-m3-error dark:border-m3-error-fixed-dim dark:bg-m3-error-container dark:text-m3-error-dark",
  info:
    "border-m3-tertiary-fixed-dim/40 bg-m3-tertiary-fixed-dim/30 text-m3-tertiary dark:bg-m3-tertiary-container dark:text-m3-tertiary-dark",
  neutral:
    "border-m3-outline-variant bg-m3-surface-container-high text-m3-on-surface-variant",
  primary:
    "border-m3-primary-fixed-dim/60 bg-m3-primary-fixed text-m3-primary",
};

export function StatusBadge({
  status,
  label,
  className = "",
}: {
  status: BadgeStatus;
  /** Кастомный label вместо стандартного */
  label?: string;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  if (!config) {
    return <Badge className={className}>{status}</Badge>;
  }

  return (
    <Badge className={`${VARIANT_CLASSES[config.variant]} ${className}`}>
      {label ?? config.label}
    </Badge>
  );
}

/** Для случаев, когда нужна только карта label → variant (без рендеринга) */
export function getBadgeVariant(status: BadgeStatus): "success" | "warning" | "danger" | "info" | "neutral" | "primary" {
  return STATUS_CONFIG[status]?.variant ?? "neutral";
}
