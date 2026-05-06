import { WorkspacePage } from "@/components/lms/workspace-page";

export default function QuizBuilderPage() {
  return <WorkspacePage title="Конструктор тестов" description="Вопросы, варианты ответа, autograding и порог прохождения." items={["Вопросы", "Ответы", "Попытки"]} />;
}

