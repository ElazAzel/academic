import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { QuestionsQueue } from "@/components/lms/dashboard-widgets";
import { Tabs } from "@/components/ui/tabs";
import { getSuperCuratorQuestions } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";
import { QuestionStatus } from "@prisma/client";

export const metadata = {
  title: "Вопросы — Супер-куратор",
  description: "Вопросы и обращения кураторов.",
};


export const dynamic = "force-dynamic";

export default async function SuperCuratorQuestionsPage() {
 await requireRolePage(["super_curator"]);

 const [open, answered] = await Promise.all([
   getSuperCuratorQuestions(QuestionStatus.OPEN),
   getSuperCuratorQuestions(QuestionStatus.ANSWERED),
 ]);

 return (
  <AppShell role="super_curator">
   <PageHeader title="Вопросы слушателей" description="Все вопросы от всех кураторов и нераспределённые." />
   <div className="mt-6">
    <Tabs tabs={[
     { label: `Открытые (${open.length})`, content: <QuestionsQueue questions={open} /> },
     { label: `Отвеченные (${answered.length})`, content: <QuestionsQueue questions={answered} /> },
    ]} />
   </div>
  </AppShell>
 );
}
