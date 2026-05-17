import { AppShell } from "@/components/layout/app-shell";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { SuperCuratorOperationsBoard } from "@/components/lms/super-curator-operations-board";
import { getSuperCuratorDashboard } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";

export const dynamic = "force-dynamic";

export default async function SuperCuratorDashboardPage() {
  await requireRolePage(["super_curator"]);
  const data = await getSuperCuratorDashboard();
  const demoMode = isDemoModeEnabled();

  if (!data && !demoMode) {
    return (
      <AppShell role="super_curator">
        <PageHeader
          title="Дашборд супер-куратора"
          description="Контроль нагрузки кураторов, проблемных вопросов, рисков и распределения по потокам."
        />
        <DashboardUnavailable />
      </AppShell>
    );
  }

  const metrics = data?.metrics ?? [];
  const curatorLoads = data?.curatorLoads ?? [];
  const cohortOperations = data?.cohortOperations ?? [];
  const problemQuestions = data?.problemQuestions ?? [];
  const riskQueue = data?.riskQueue ?? [];

  return (
    <AppShell role="super_curator">
      <PageHeader
        title="Дашборд супер-куратора"
        description="Что требует внимания: перегрузка кураторов, риски потоков, проблемные вопросы и перераспределение."
      />
      <div className="space-y-6">
        <MetricGrid metrics={metrics} />
        <SuperCuratorOperationsBoard
          curatorLoads={curatorLoads}
          cohortOperations={cohortOperations}
          problemQuestions={problemQuestions}
          riskQueue={riskQueue}
        />
      </div>
    </AppShell>
  );
}
