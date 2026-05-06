import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { WorkQueue } from "@/components/lms/dashboard-widgets";

export default function CustomerObserverDashboardPage() {
  return (
    <AppShell>
      <PageHeader title="Кабинет заказчика" description="Read-only отчёты по проекту, прогрессу, посещаемости и сертификатам." badge="Заказчик / наблюдатель" />
      <WorkQueue role="observer" />
    </AppShell>
  );
}

