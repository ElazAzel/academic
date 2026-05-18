import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { QuestionsQueue } from "@/components/lms/dashboard-widgets";
import { Tabs } from "@/components/ui/tabs";
import { getCuratorQuestions } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";
import { QuestionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function CuratorQuestionsPage() {
 await requireRolePage(["curator", "super_curator"]);
 
 const [open, answered] = await Promise.all([
   getCuratorQuestions(QuestionStatus.OPEN),
   getCuratorQuestions(QuestionStatus.ANSWERED),
 ]);

 return (
  <AppShell role="curator">
   <PageHeader title="Вопросы слушателей" description="Все вопросы ваших слушателей по урокам."/>
   <div className="mt-6">
    <Tabs tabs={[
     { label: `Открытые (${open.length})`, content: <QuestionsQueue questions={open}/> },
     { label: `Отвеченные (${answered.length})`, content: <QuestionsQueue questions={answered}/> },
    ]}/>
   </div>
  </AppShell>
 );
}
