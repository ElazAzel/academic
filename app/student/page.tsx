import { AppShell } from "@/components/layout/app-shell";
import { ContinueLearningCard, CourseGrid, MetricGrid, WorkQueue } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";

export default function StudentDashboardPage() {
  return (
    <AppShell>
      <PageHeader
        title="Дашборд слушателя"
        description="Главный экран показывает не приветствие, а следующее действие: урок, дедлайн, прогресс и ответы куратора."
        badge="Слушатель"
      />
      <div className="space-y-5">
        <MetricGrid />
        <ContinueLearningCard />
        <CourseGrid />
        <WorkQueue role="student" />
      </div>
    </AppShell>
  );
}

