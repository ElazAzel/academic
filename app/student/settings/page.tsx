import { WorkspacePage } from "@/components/lms/workspace-page";

export default function StudentSettingsPage() {
  return <WorkspacePage title="Профиль и настройки" description="Данные профиля, согласия, уведомления и безопасность аккаунта." items={["Профиль", "Согласия", "Безопасность"]} />;
}

