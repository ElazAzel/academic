import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { NotificationsList } from "@/components/lms/notifications-list";
import { requireRolePage } from "@/lib/auth/page-guards";

export const metadata = {
  title: "Уведомления — Инструктор",
  description: "Центр уведомлений инструктора.",
};


export const dynamic = "force-dynamic";

export default async function InstructorNotificationsPage() {
  await requireRolePage(["instructor"]);

  return (
    <AppShell role="instructor">
      <PageHeader
        title="Уведомления"
        description="Уведомления о вопросах и заданиях."
      />
      <div className="mt-6">
        <NotificationsList />
      </div>
    </AppShell>
  );
}
