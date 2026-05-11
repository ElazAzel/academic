import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRolePage } from "@/lib/auth/page-guards";
import { listNotifications } from "@/server/modules/notifications/service";
import { Bell, MessageCircle, FileText, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

export const dynamic = "force-dynamic";

const ICON_MAP: Record<string, React.ElementType> = {
 question_answered: MessageCircle,
 module_deadline_near: Clock,
 assignment_reviewed: FileText,
 default: Bell
};

export default async function StudentNotificationsPage() {
 const user = await requireRolePage(["student"]);
 const notifications = await listNotifications(user.id);

 return (
  <AppShell role="student">
   <PageHeader title="Уведомления" description="Уведомления об ответах кураторов, дедлайнах и оценках."/>
   <div className="space-y-2 mt-6">
    {notifications.length > 0 ? (
     notifications.map((n) => {
      const Icon = ICON_MAP[n.type] ?? ICON_MAP.default;
      return (
       <Card key={n.id} className={`transition-shadow hover:shadow-sm ${!n.readAt ? "border-primary/20 bg-primary/[0.02]" : ""}`}>
        <CardContent className="flex items-start gap-4 py-4">
         <span className="mt-0.5 text-primary">
          <Icon className="h-5 w-5"/>
         </span>
         <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
           <p className="text-sm font-medium">{n.title}</p>
           {!n.readAt && <span className="h-2 w-2 rounded-full bg-primary shrink-0"/>}
          </div>
          <p className="text-xs text-muted-foreground">{n.body}</p>
         </div>
         <span className="text-xs text-muted-foreground shrink-0">
          {formatDistanceToNow(n.createdAt, { addSuffix: true, locale: ru })}
         </span>
        </CardContent>
       </Card>
      );
     })
    ) : (
     <Card className="rounded-2xl">
      <CardContent className="py-10 text-center text-muted-foreground">
       У вас пока нет уведомлений.
      </CardContent>
     </Card>
    )}
   </div>
  </AppShell>
 );
}
