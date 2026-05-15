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
   />
    <DashboardUnavailable/>
   </AppShell>
  );
 }

 const metrics = data?.metrics ?? [];
 const questions = data?.questions ?? [];
 const submissions = data?.submissions ?? [];
 const risks = data?.risks ?? [];

 const openQuestions = questions.filter((q) => q.status === "open");

 return (
  <AppShell role="curator">
   <PageHeader
    title="Дашборд куратора"
    description="Вопросы слушателей, задания на проверку и риски."
  />
   <div className="space-y-6">
    <MetricGrid metrics={metrics}/>

    <Tabs
     paramName="tab"
     tabs={[
      {
       label: `Вопросы (${openQuestions.length})`,
       content: <QuestionsQueue questions={openQuestions}/>,
      },
      {
       label: `Задания (${submissions.length})`,
       content: <SubmissionsQueue submissions={submissions}/>,
      },
      {
       label: `Риски (${risks.length})`,
       content: <RisksList risks={risks}/>,
      },
     ]}
   />
   </div>
  </AppShell>
 );
}
