import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { StudentAnalyticsTable } from "@/components/lms/student-analytics-table";
import { Icon } from "@/components/ui/icon";
import type { DashboardMetric } from "@/types/domain";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCuratorStudentAnalytics } from "@/server/actions/dashboard";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";

export const metadata = {
  title: "Аналитика — Куратор",
  description: "Аналитика успеваемости студентов.",
};


export const dynamic = "force-dynamic";

export default async function CuratorAnalyticsPage() {
  await requireRolePage(["curator"]);
  const students = await getCuratorStudentAnalytics();
  const demoMode = isDemoModeEnabled();

  if (students.length === 0 && !demoMode) {
    return (
      <AppShell role="curator">
        <PageHeader title="Аналитика" description="Детальная аналитика по слушателям." />
        <DashboardUnavailable />
      </AppShell>
    );
  }

  const total = students.length;
  const completed = students.filter((s) => s.progressStatus === "COMPLETED").length;
  const avgProgress = total > 0 ? Math.round(students.reduce((s, c) => s + c.coursePercent, 0) / total) : 0;
  const withRisks = students.filter((s) => s.riskCount > 0).length;
  const lowProgress = students.filter((s) => s.coursePercent < 40 && s.progressStatus !== "COMPLETED").length;
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const staleLogin = students.filter((s) => {
    if (!s.lastLoginAt) return true;
    return now - new Date(s.lastLoginAt).getTime() >= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const metrics: DashboardMetric[] = [
    { label: "Мои слушатели", value: total, tone: "primary", detail: `${completed} завершили` },
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
      priority: withRisks > 3 ? "critical" : withRisks > 0 ? "elevated" : "normal",
      href: "/curator/risks",
    },
    {
      label: "Нет входа 7+ дн.",
      value: staleLogin,
      tone: staleLogin > 0 ? "warning" : "success",
      detail: "Приоритетный контакт",
      priority: staleLogin > 0 ? "elevated" : "normal",
    },
  ];

  return (
    <AppShell role="curator">
      <PageHeader title="Аналитика" description="Детальная аналитика по слушателям: прогресс, текущий модуль/блок/урок, активность." />
      <div className="space-y-6">
        <MetricGrid metrics={metrics} />
        <div className="flex items-center gap-2 mb-4">
          <span className="font-body-sm text-body-sm text-m3-on-surface-variant mr-1">Скачать отчёт:</span>
          <a href="/api/v1/reports?type=curator_progress&format=csv" className="inline-flex items-center gap-1 rounded-lg border border-m3-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface transition-colors hover:bg-m3-surface-container-high hover:border-m3-primary/30">
            <Icon name="download" className="text-[16px]" /> CSV
          </a>
          <a href="/api/v1/reports?type=curator_progress&format=xlsx" className="inline-flex items-center gap-1 rounded-lg border border-m3-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface transition-colors hover:bg-m3-surface-container-high hover:border-m3-primary/30">
            <Icon name="download" className="text-[16px]" /> Excel
          </a>
          <a href="/api/v1/reports?type=curator_progress&format=pdf" className="inline-flex items-center gap-1 rounded-lg border border-m3-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface transition-colors hover:bg-m3-surface-container-high hover:border-m3-primary/30">
            <Icon name="download" className="text-[16px]" /> PDF
          </a>
        </div>
        <StudentAnalyticsTable students={students} />
      </div>
    </AppShell>
  );
}
