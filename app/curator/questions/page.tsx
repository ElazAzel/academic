import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { QuestionsQueue } from "@/components/lms/dashboard-widgets";
import { Tabs } from "@/components/ui/tabs";
import { MOCK_QUESTIONS } from "@/lib/mock-data";

export default function CuratorQuestionsPage() {
  const open = MOCK_QUESTIONS.filter((q) => q.status === "open");
  const answered = MOCK_QUESTIONS.filter((q) => q.status === "answered");

  return (
    <AppShell role="curator">
      <PageHeader title="Вопросы слушателей" description="Все вопросы ваших слушателей по урокам." badge="Куратор" />
      <Tabs tabs={[
        { label: `Открытые (${open.length})`, content: <QuestionsQueue questions={open} /> },
        { label: `Отвеченные (${answered.length})`, content: <QuestionsQueue questions={answered} /> },
      ]} />
    </AppShell>
  );
}
