import { AppShell } from "@/components/layout/app-shell";
import {
  MetricGrid,
  QuestionsQueue,
  SubmissionsQueue,
  RisksList,
} from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { Tabs } from "@/components/ui/tabs";
import { getCuratorDashboard } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";
import {
  getCuratorMetrics,
  MOCK_QUESTIONS,
  MOCK_SUBMISSIONS,
  MOCK_RISKS,
} from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function CuratorDashboardPage() {
  await requireRolePage(["curator"]);
  const data = await getCuratorDashboard();
  const demoMode = isDemoModeEnabled();

  if (!data && !demoMode) {
    return (
      <AppShell role="curator">
        <PageHeader
          title="Дашборд куратора"
          description="Вопросы слушателей, задания на проверку и риски."
          badge="Куратор"
        />
        <DashboardUnavailable />
      </AppShell>
    );
  }

  const metrics = data?.metrics ?? getCuratorMetrics();
  const questions = data?.questions ?? MOCK_QUESTIONS;
  const submissions = data?.submissions ?? MOCK_SUBMISSIONS;
  const risks = data?.risks ?? MOCK_RISKS;

  const openQuestions = questions.filter((q) => q.status === "open");

  return (
    <AppShell role="curator">
      <PageHeader
        title="Дашборд куратора"
        description="Вопросы слушателей, задания на проверку и риски."
        badge="Куратор"
      />
      <div className="space-y-6">
        <MetricGrid metrics={metrics} />

        <Tabs
          tabs={[
            {
              label: `Вопросы (${openQuestions.length})`,
              content: <QuestionsQueue questions={openQuestions} />,
            },
            {
              label: `Задания (${submissions.length})`,
              content: <SubmissionsQueue submissions={submissions} />,
            },
            {
              label: `Риски (${risks.length})`,
              content: <RisksList risks={risks} />,
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
