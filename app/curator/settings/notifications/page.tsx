import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { NotificationPreferencesForm } from "@/components/lms/notification-preferences-form";
import { requireRolePage } from "@/lib/auth/page-guards";

export const metadata = {
  title: "Настройки уведомлений — Куратор",
  description: "Настройки уведомлений куратора.",
};


export const dynamic = "force-dynamic";

export default async function CuratorNotificationPreferencesPage() {
  await requireRolePage(["curator", "super_curator", "admin"]);

  return (
    <AppShell role="curator">
      <PageHeader title="Настройки уведомлений" description="Управляйте уведомлениями: ответы, дедлайны, новые уроки." />
      <NotificationPreferencesForm />
    </AppShell>
  );
}
