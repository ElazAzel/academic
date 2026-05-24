import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { NotificationsList } from "@/components/lms/notifications-list";
import { requireRolePage } from "@/lib/auth/page-guards";

export const metadata = {
  title: "Уведомления — Супер-куратор",
  description: "Центр уведомлений супер-куратора.",
};


export const dynamic = "force-dynamic";

export default async function SuperCuratorNotificationsPage() {
  await requireRolePage(["super_curator"]);

  return (
    <AppShell role="super_curator">
      <PageHeader
        title="Уведомления"
        description="Уведомления о сообщениях, вопросах и изменениях."
      />
      <div className="mt-6">
        <NotificationsList />
      </div>
    </AppShell>
  );
}
