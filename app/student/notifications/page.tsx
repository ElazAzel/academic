import { WorkspacePage } from "@/components/lms/workspace-page";

export default function StudentNotificationsPage() {
  return <WorkspacePage title="Уведомления" description="Единый notification center для событий обучения и кураторских ответов." items={["Новые", "Прочитанные", "Настройки"]} />;
}

