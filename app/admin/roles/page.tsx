import { WorkspacePage } from "@/components/lms/workspace-page";

export default function AdminRolesPage() {
  return <WorkspacePage title="Роли и права" description="RBAC матрица и серверные permissions." items={["Роли", "Права", "Назначения"]} />;
}

