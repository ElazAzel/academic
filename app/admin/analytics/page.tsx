import { WorkspacePage } from "@/components/lms/workspace-page";

export default function AdminAnalyticsPage() {
  return <WorkspacePage title="Аналитика" description="Активные пользователи, завершение, тесты, выручка и экспорт." items={["Пользователи", "Завершение", "Выручка"]} />;
}

