import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { CuratorLoadTable } from "@/components/lms/dashboard-widgets";
import { MOCK_CURATOR_LOADS } from "@/lib/mock-data";
import { requireRolePage } from "@/lib/auth/page-guards";

export default async function SuperCuratorCuratorsPage() {
  await requireRolePage(["super_curator"]);

  return (
    <AppShell role="super_curator">
      <PageHeader title="Кураторы" description="Нагрузка, SLA ответов, открытые вопросы и задания." badge="Супер-куратор" />
      <CuratorLoadTable curators={MOCK_CURATOR_LOADS} />
    </AppShell>
  );
}
