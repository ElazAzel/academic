import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { StudentAnalyticsTable } from "@/components/lms/student-analytics-table";
import { Icon } from "@/components/ui/icon";
import type { DashboardMetric } from "@/types/domain";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getSuperCuratorStudentAnalytics } from "@/server/actions/dashboard";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";
import { VisitAnalyticsBlock } from "@/components/admin/visit-analytics-block";

export const metadata = {
  title: "Аналитика — Супер-куратор",
  description: "Аналитика по всем когортам.",
};


export const dynamic = "force-dynamic";

export default async function SuperCuratorAnalyticsPage() {
  await requireRolePage(["super_curator"]);
  const students = await getSuperCuratorStudentAnalytics();
  const demoMode = isDemoModeEnabled();

  if (students.length === 0 && !demoMode) {
    return (
      <AppShell role="super_curator">
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
  const staleLogin = students.filter((s) => {
    if (!s.lastLoginAt) return true;
    return Date.now() - new Date(s.lastLoginAt).getTime() >= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const metrics: DashboardMetric[] = [
    { label: "Всего слушателей", value: total, tone: "primary", detail: `${completed} завершили` },
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
      priority: withRisks > 5 ? "critical" : withRisks > 0 ? "elevated" : "normal",
      href: "/super-curator/risks",
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
    <AppShell role="super_curator">
      <PageHeader title="Аналитика" description="Детальная аналитика по слушателям всех кураторов." />
      <div className="space-y-6">
        <MetricGrid metrics={metrics} />
        <div className="flex items-center gap-2 mb-4">
          <span className="font-body-sm text-body-sm text-m3-on-surface-variant mr-1">Скачать отчёт:</span>
          <a href="/api/v1/reports?type=progress&format=csv" className="inline-flex items-center gap-1 rounded-lg border border-m3-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface transition-colors hover:bg-m3-surface-container-high hover:border-m3-primary/30">
            <Icon name="download" className="text-[16px]" /> CSV
          </a>
          <a href="/api/v1/reports?type=progress&format=xlsx" className="inline-flex items-center gap-1 rounded-lg border border-m3-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface transition-colors hover:bg-m3-surface-container-high hover:border-m3-primary/30">
            <Icon name="download" className="text-[16px]" /> Excel
          </a>
          <a href="/api/v1/reports?type=progress&format=pdf" className="inline-flex items-center gap-1 rounded-lg border border-m3-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface transition-colors hover:bg-m3-surface-container-high hover:border-m3-primary/30">
            <Icon name="download" className="text-[16px]" /> PDF
          </a>
        </div>
        <StudentAnalyticsTable students={students} />

        <div className="pt-6">
          <h2 className="font-label-lg text-label-lg text-m3-on-surface mb-4">Посещаемость слушателей</h2>
          <VisitAnalyticsBlock days={30} roleFilter="student" />
        </div>
      </div>
    </AppShell>
  );
}
