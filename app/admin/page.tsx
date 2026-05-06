import { AppShell } from "@/components/layout/app-shell";
import { MetricGrid, WorkQueue } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";

export default function AdminDashboardPage() {
  return (
    <AppShell>
      <PageHeader title="Админ-дашборд" description="Операционное состояние академии: курсы, потоки, пользователи, аудит и согласия." badge="Администратор" />
      <div className="space-y-5">
        <MetricGrid />
        <WorkQueue role="admin" />
      </div>
    </AppShell>
  );
}

