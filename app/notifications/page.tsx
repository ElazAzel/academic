import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { NotificationsList } from "@/components/lms/notifications-list";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCurrentUser } from "@/lib/auth/session";
import type { RoleKey } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireRolePage(["student", "curator", "super_curator", "admin", "instructor"]);
  const role: RoleKey = user.roles.includes("admin")
    ? "admin"
    : user.roles.includes("super_curator")
      ? "super_curator"
      : user.roles.includes("curator")
        ? "curator"
        : user.roles.includes("instructor")
          ? "instructor"
          : "student";

  return (
    <AppShell role={role}>
      <PageHeader
        title="Уведомления"
        description="Все уведомления: сообщения, попапы, прогресс обучения."
      />
      <div className="mt-6">
        <NotificationsList />
      </div>
    </AppShell>
  );
}
