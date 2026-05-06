import { WorkspacePage } from "@/components/lms/workspace-page";

export default function InstructorAnalyticsPage() {
  return <WorkspacePage title="Аналитика курса" description="Прогресс, тесты, задания и активность слушателей." items={["Прогресс", "Тесты", "Задания"]} />;
}

