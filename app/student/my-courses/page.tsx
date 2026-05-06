import { WorkspacePage } from "@/components/lms/workspace-page";

export default function MyCoursesPage() {
  return <WorkspacePage title="Мои курсы" description="Назначенные академией курсы, потоки и текущий прогресс." items={["Активные курсы", "Архив", "Продолжить обучение"]} />;
}

