import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { WorkQueue } from "@/components/lms/dashboard-widgets";

export default function CuratorDashboardPage() {
  return (
    <AppShell>
      <PageHeader title="Дашборд куратора" description="Новые вопросы, задания на проверку и риски слушателей." badge="Куратор" />
      <WorkQueue role="curator" />
    </AppShell>
  );
}

