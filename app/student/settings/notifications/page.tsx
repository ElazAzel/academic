import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { NotificationPreferencesForm } from "@/components/lms/notification-preferences-form";
import { requireRolePage } from "@/lib/auth/page-guards";

export const dynamic = "force-dynamic";

export default async function StudentNotificationPreferencesPage() {
  await requireRolePage(["student"]);

  return (
    <AppShell role="student">
      <PageHeader title="Настройки уведомлений" description="Управляйте типами уведомлений, которые хотите получать." />
      <NotificationPreferencesForm />
    </AppShell>
  );
}
