import { WorkspacePage } from "@/components/lms/workspace-page";

export default function InstructorDashboardPage() {
  return <WorkspacePage title="Дашборд преподавателя" description="Курсы, уроки, тесты, задания и аналитика курса." badge="Преподаватель" items={["Мои курсы", "Материалы", "Аналитика"]} />;
}

