import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { NotificationsList } from "@/components/lms/notifications-list";
import { requireRolePage } from "@/lib/auth/page-guards";

export const dynamic = "force-dynamic";

export default async function StudentNotificationsPage() {
 await requireRolePage(["student"]);

 return (
  <AppShell role="student">
   <PageHeader
    title="Уведомления"
    description="Уведомления об ответах кураторов, дедлайнах, оценках и сообщениях."
   />
   <div className="mt-6">
    <NotificationsList />
   </div>
  </AppShell>
 );
}
