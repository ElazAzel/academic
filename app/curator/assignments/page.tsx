import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { SubmissionsQueue } from "@/components/lms/dashboard-widgets";
import { MOCK_SUBMISSIONS } from "@/lib/mock-data";

export default function CuratorAssignmentsPage() {
  return (
    <AppShell role="curator">
      <PageHeader title="Задания на проверку" description="Работы слушателей, ожидающие вашей оценки." badge="Куратор" />
      <SubmissionsQueue submissions={MOCK_SUBMISSIONS} />
    </AppShell>
  );
}
