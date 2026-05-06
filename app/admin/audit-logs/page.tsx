import { WorkspacePage } from "@/components/lms/workspace-page";

export default function AdminAuditPage() {
  return <WorkspacePage title="Журнал действий" description="Аудит действий администраторов и важных событий платформы." items={["События", "Фильтры", "Экспорт"]} />;
}

