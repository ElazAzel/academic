import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { RisksList } from "@/components/lms/dashboard-widgets";
import { MOCK_RISKS } from "@/lib/mock-data";
import { requireRolePage } from "@/lib/auth/page-guards";

export default async function SuperCuratorRisksPage() {
  await requireRolePage(["super_curator"]);

  return (
    <AppShell role="super_curator">
      <PageHeader title="Риски по потокам" description="Агрегированные риски всех потоков: неактивные, просроченные, отстающие слушатели." badge="Супер-куратор" />
      <RisksList risks={MOCK_RISKS} />
    </AppShell>
  );
}
