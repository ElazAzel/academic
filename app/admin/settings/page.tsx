import { WorkspacePage } from "@/components/lms/workspace-page";

export default function AdminSettingsPage() {
  return <WorkspacePage title="Настройки" description="Feature flags, интеграции, сертификаты, уведомления и безопасность." items={["Feature flags", "Интеграции", "Сертификаты"]} />;
}

