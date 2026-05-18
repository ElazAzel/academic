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

  const metrics: DashboardMetric[] = [
    { label: "Всего слушателей", value: total, tone: "primary" },
    { label: "Завершили курс", value: completed, tone: "success" },
    { label: "Средний прогресс", value: `${avgProgress}%`, tone: avgProgress > 50 ? "success" : "warning" },
    { label: "С рисками", value: withRisks, tone: withRisks > 5 ? "danger" : "info" },
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
      </div>
    </AppShell>
  );
}
