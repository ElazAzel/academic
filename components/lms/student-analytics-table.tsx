import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { EmptyState } from "@/components/lms/empty-state";
import type { DashboardMetric, StudentAnalyticsDetail } from "@/types/domain";

function getAgeDays(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function daysSince(dateStr: string): string {
  const days = getAgeDays(dateStr) ?? 0;
  if (days === 0) return "сегодня";
  if (days === 1) return "вчера";
  return `${days} дн. назад`;
}

export function StudentAnalyticsTable({ students }: { students: StudentAnalyticsDetail[] }) {
  if (students.length === 0) {
    return (
      <EmptyState icon="group" title="Нет данных по слушателям" description="В данной выборке пока нет зарегистрированных слушателей." />
    );
  }

  const total = students.length;
  const completed = students.filter((s) => s.progressStatus === "COMPLETED").length;
  const avgProgress = Math.round(students.reduce((s, c) => s + c.coursePercent, 0) / total);
  const withRisks = students.filter((s) => s.riskCount > 0).length;
  const lowProgress = students.filter((s) => s.coursePercent < 40 && s.progressStatus !== "COMPLETED").length;
  const staleLogin = students.filter((s) => {
    const days = getAgeDays(s.lastLoginAt);
    return days === null || days >= 7;
  }).length;
  const metrics = [
    { label: "Всего", value: total, tone: "primary", detail: `${completed} завершили` },
    {
      label: "Средний прогресс",
      value: `${avgProgress}%`,
      tone: avgProgress >= 70 ? "success" : avgProgress >= 40 ? "warning" : "danger",
      detail: `${lowProgress} ниже 40%`,
      priority: lowProgress > 0 ? "elevated" : "normal",
    },
    {
      label: "С рисками",
      value: withRisks,
      tone: withRisks > 0 ? "danger" : "success",
      detail: "Открытые флаги",
      priority: withRisks > 0 ? "elevated" : "normal",
    },
    {
      label: "Нет входа 7+ дн.",
      value: staleLogin,
      tone: staleLogin > 0 ? "warning" : "success",
      detail: "Нужен контакт",
      priority: staleLogin > 0 ? "elevated" : "normal",
    },
  ] satisfies DashboardMetric[];

  return (
    <div className="space-y-4">
      <MetricGrid metrics={metrics} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Слушатель</TableHead>
            <TableHead>Курс</TableHead>
            <TableHead>Поток</TableHead>
            <TableHead>Прогресс</TableHead>
            <TableHead>Модуль</TableHead>
            <TableHead>Блок</TableHead>
            <TableHead>Урок</TableHead>
            <TableHead>Последний вход</TableHead>
            <TableHead>Ср. время/урок</TableHead>
            <TableHead>Риски</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((s) => {
            const progressTone = s.coursePercent >= 70 ? "bg-emerald-500" : s.coursePercent >= 40 ? "bg-amber-500" : "bg-rose-500";
            const stale = !s.lastLoginAt || (getAgeDays(s.lastLoginAt) ?? 0) >= 7;
            return (
              <TableRow key={s.enrollmentId} className={s.riskCount > 0 || stale ? "bg-m3-error-container/10" : ""}>
                <TableCell>
                  <div>
                    <p className="text-label-md font-label-md text-m3-on-surface">{s.name}</p>
                    <p className="text-body-sm font-body-sm text-m3-on-surface-variant">{s.email}</p>
                  </div>
                </TableCell>
                <TableCell className="min-w-[180px] text-body-sm font-body-sm">{s.courseTitle}</TableCell>
                <TableCell className="text-body-sm font-body-sm">{s.cohortName ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex min-w-[120px] items-center gap-2">
                    <div className="h-2.5 w-20 overflow-hidden rounded-full bg-m3-surface-variant">
                      <div
                        className={`h-full rounded-full transition-all ${progressTone}`}
                        style={{ width: `${s.coursePercent}%` }}
                      />
                    </div>
                    <span className="text-label-md font-label-md tabular-nums text-m3-on-surface">{s.coursePercent}%</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-body-sm font-body-sm" title={s.moduleTitle ?? ""}>
                  {s.moduleTitle ?? "—"}
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-body-sm font-body-sm" title={s.blockTitle ?? ""}>
                  {s.blockTitle ?? "—"}
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-body-sm font-body-sm" title={s.lessonTitle ?? ""}>
                  {s.lessonTitle ?? "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-body-sm font-body-sm">
                  {s.lastLoginAt ? daysSince(s.lastLoginAt) : "никогда"}
                </TableCell>
                <TableCell className="text-body-sm font-body-sm tabular-nums">
                  {s.avgLessonMinutes > 0 ? `${s.avgLessonMinutes} мин` : "—"}
                </TableCell>
                <TableCell>
                  {s.riskCount > 0 ? (
                    <Badge className="border-rose-200 bg-rose-50 text-xs font-label-md text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                      {s.riskCount} риск.
                    </Badge>
                  ) : (
                    <Badge className="border-emerald-200 bg-emerald-50 text-xs font-label-md text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                      0
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
