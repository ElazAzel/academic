import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { RisksList } from "@/components/lms/dashboard-widgets";
import { MOCK_RISKS } from "@/lib/mock-data";

export default function CuratorRisksPage() {
  return (
    <AppShell role="curator">
      <PageHeader title="Риски слушателей" description="Слушатели с рисками: неактивные, просроченные, отстающие." badge="Куратор" />
      <RisksList risks={MOCK_RISKS} />
    </AppShell>
  );
}
