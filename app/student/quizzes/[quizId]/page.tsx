import { WorkspacePage } from "@/components/lms/workspace-page";

export default async function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  return <WorkspacePage title="Тест" description={`Autograding, попытки и pass threshold для теста ${quizId}.`} items={["Вопросы", "Попытки", "Результат"]} />;
}

