import { AppShell } from "@/components/layout/app-shell";
import {
  MetricGrid,
  QuestionsQueue,
  SubmissionsQueue,
  RisksList,
} from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { Tabs } from "@/components/ui/tabs";
import {
  getCuratorMetrics,
  MOCK_QUESTIONS,
  MOCK_SUBMISSIONS,
  MOCK_RISKS,
} from "@/lib/mock-data";

export default function CuratorDashboardPage() {
  const metrics = getCuratorMetrics();
  const openQuestions = MOCK_QUESTIONS.filter((q) => q.status === "open");

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
              label: `Задания (${MOCK_SUBMISSIONS.length})`,
              content: <SubmissionsQueue submissions={MOCK_SUBMISSIONS} />,
            },
            {
              label: `Риски (${MOCK_RISKS.length})`,
              content: <RisksList risks={MOCK_RISKS} />,
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
