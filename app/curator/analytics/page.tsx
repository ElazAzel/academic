import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { StudentAnalyticsTable } from "@/components/lms/student-analytics-table";
import type { DashboardMetric } from "@/types/domain";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCuratorStudentAnalytics } from "@/server/actions/dashboard";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";

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

  const metrics: DashboardMetric[] = [
    { label: "Мои слушатели", value: total, tone: "primary" },
    { label: "Завершили курс", value: completed, tone: "success" },
    { label: "Средний прогресс", value: `${avgProgress}%`, tone: avgProgress > 50 ? "success" : "warning" },
    { label: "С рисками", value: withRisks, tone: withRisks > 3 ? "danger" : "info" },
  ];

  return (
    <AppShell role="curator">
      <PageHeader title="Аналитика" description="Детальная аналитика по слушателям: прогресс, текущий модуль/блок/урок, активность." />
      <div className="space-y-6">
        <MetricGrid metrics={metrics} />
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground mr-1">Скачать отчёт:</span>
          <a href="/api/v1/reports?type=curator_progress&format=csv" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">CSV</a>
          <a href="/api/v1/reports?type=curator_progress&format=xlsx" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">Excel</a>
          <a href="/api/v1/reports?type=curator_progress&format=pdf" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">PDF</a>
        </div>
        <StudentAnalyticsTable students={students} />
      </div>
    </AppShell>
  );
}
