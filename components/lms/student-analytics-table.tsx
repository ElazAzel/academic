"use client";

/* eslint-disable react-hooks/incompatible-library -- TanStack Virtual's useVirtualizer is a known false positive */

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Badge } from "@/components/ui/badge";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { EmptyState } from "@/components/lms/empty-state";
import type { DashboardMetric, StudentAnalyticsDetail } from "@/types/domain";

const ROW_HEIGHT = 60;
const TABLE_MAX_HEIGHT = 600;

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: students.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();

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

  const progressTone = (percent: number) =>
    percent >= 70 ? "bg-emerald-500" : percent >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="space-y-4">
      <MetricGrid metrics={metrics} />

      <div ref={scrollRef} className="overflow-auto rounded-md border" style={{ maxHeight: TABLE_MAX_HEIGHT }}>
        {/* Top spacer */}
        <div style={{ height: virtualItems[0]?.start ?? 0 }} />

        <table className="w-full caption-bottom text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Слушатель</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Курс</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Поток</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Прогресс</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Модуль</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Блок</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Урок</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Последний вход</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Ср. время/урок</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Риски</th>
            </tr>
          </thead>
          <tbody>
            {virtualItems.map((virtualItem) => {
              const s = students[virtualItem.index];
              const stale = !s.lastLoginAt || (getAgeDays(s.lastLoginAt) ?? 0) >= 7;
              return (
                <tr
                  key={s.enrollmentId}
                  className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${s.riskCount > 0 || stale ? "bg-m3-error-container/10" : ""}`}
                >
                  <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                    <div>
                      <p className="text-label-md font-label-md text-m3-on-surface">{s.name}</p>
                      <p className="text-body-sm font-body-sm text-m3-on-surface-variant">{s.email}</p>
                    </div>
                  </td>
                  <td className="min-w-[180px] p-4 align-middle text-body-sm font-body-sm [&:has([role=checkbox])]:pr-0">{s.courseTitle}</td>
                  <td className="p-4 align-middle text-body-sm font-body-sm [&:has([role=checkbox])]:pr-0">{s.cohortName ?? "—"}</td>
                  <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                    <div className="flex min-w-[120px] items-center gap-2">
                      <div className="h-2.5 w-20 overflow-hidden rounded-full bg-m3-surface-variant">
                        <div
                          className={`h-full rounded-full transition-all ${progressTone(s.coursePercent)}`}
                          style={{ width: `${s.coursePercent}%` }}
                        />
                      </div>
                      <span className="text-label-md font-label-md tabular-nums text-m3-on-surface">{s.coursePercent}%</span>
                    </div>
                  </td>
                  <td className="max-w-[160px] truncate p-4 align-middle text-body-sm font-body-sm [&:has([role=checkbox])]:pr-0" title={s.moduleTitle ?? ""}>
                    {s.moduleTitle ?? "—"}
                  </td>
                  <td className="max-w-[160px] truncate p-4 align-middle text-body-sm font-body-sm [&:has([role=checkbox])]:pr-0" title={s.blockTitle ?? ""}>
                    {s.blockTitle ?? "—"}
                  </td>
                  <td className="max-w-[160px] truncate p-4 align-middle text-body-sm font-body-sm [&:has([role=checkbox])]:pr-0" title={s.lessonTitle ?? ""}>
                    {s.lessonTitle ?? "—"}
                  </td>
                  <td className="whitespace-nowrap p-4 align-middle text-body-sm font-body-sm [&:has([role=checkbox])]:pr-0">
                    {s.lastLoginAt ? daysSince(s.lastLoginAt) : "никогда"}
                  </td>
                  <td className="p-4 align-middle text-body-sm font-body-sm tabular-nums [&:has([role=checkbox])]:pr-0">
                    {s.avgLessonMinutes > 0 ? `${s.avgLessonMinutes} мин` : "—"}
                  </td>
                  <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                    {s.riskCount > 0 ? (
                      <Badge className="border-rose-200 bg-rose-50 text-xs font-label-md text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                        {s.riskCount} риск.
                      </Badge>
                    ) : (
                      <Badge className="border-emerald-200 bg-emerald-50 text-xs font-label-md text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                        0
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Bottom spacer */}
        {virtualItems.length > 0 && (
          <div style={{ height: virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0) }} />
        )}
      </div>
    </div>
  );
}
