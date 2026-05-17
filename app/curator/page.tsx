import { AppShell } from "@/components/layout/app-shell";
import {
  MetricGrid,
  QuestionsQueue,
  SubmissionsQueue,
  RisksList,
} from "@/components/lms/dashboard-widgets";
import { CuratorOperationsBoard } from "@/components/lms/curator-operations-board";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";
import { PageHeader } from "@/components/lms/page-header";
import { Tabs } from "@/components/ui/tabs";
import { requireRolePage } from "@/lib/auth/page-guards";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { getCuratorDashboard } from "@/server/actions/dashboard";

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
          description="Операционные очереди, закрепленные слушатели, риски и быстрый чат."
        />
        <DashboardUnavailable />
      </AppShell>
    );
  }

  const metrics = data?.metrics ?? [];
  const questions = data?.questions ?? [];
  const submissions = data?.submissions ?? [];
  const risks = data?.risks ?? [];
  const students = data?.students ?? [];
  const openQuestions = questions.filter((question) => question.status === "open");

  return (
    <AppShell role="curator">
      <PageHeader
        title="Дашборд куратора"
        description="Что требует внимания по закрепленным слушателям: вопросы, задания, риски, дедлайны и чат."
      />
      <div className="space-y-6">
        <MetricGrid metrics={metrics} />
        <CuratorOperationsBoard students={students} />

        <Tabs
          paramName="tab"
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
