import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { NotificationsList } from "@/components/lms/notifications-list";
import { requireRolePage } from "@/lib/auth/page-guards";

export const metadata = {
  title: "Уведомления — Администрирование",
  description: "Управление системными уведомлениями.",
};


export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  await requireRolePage(["admin"]);

  return (
    <AppShell role="admin">
      <PageHeader
        title="Уведомления"
        description="Все системные уведомления и сообщения."
      />
      <div className="mt-6">
        <NotificationsList />
      </div>
    </AppShell>
  );
}
