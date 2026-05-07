import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, MessageCircle, FileText, Clock } from "lucide-react";

const MOCK_NOTIFICATIONS = [
  { id: "n1", type: "answer" as const, title: "Куратор ответил на вопрос", body: "По уроку «Unit-экономика AI»", time: "2 часа назад", read: false },
  { id: "n2", type: "deadline" as const, title: "Дедлайн через 3 дня", body: "Модуль «Практика» — до 10 мая", time: "1 день назад", read: false },
  { id: "n3", type: "grade" as const, title: "Задание оценено", body: "«План внедрения» — 8/10", time: "2 дня назад", read: true },
  { id: "n4", type: "system" as const, title: "Новый урок добавлен", body: "В модуль «Финальный проект»", time: "3 дня назад", read: true },
];

const ICON_MAP = { answer: MessageCircle, deadline: Clock, grade: FileText, system: Bell };
const COLOR_MAP = { answer: "text-primary", deadline: "text-amber-500", grade: "text-emerald-500", system: "text-muted-foreground" };

export default function StudentNotificationsPage() {
  return (
    <AppShell role="student">
      <PageHeader title="Уведомления" description="Уведомления об ответах кураторов, дедлайнах и оценках." badge="Слушатель" />
      <div className="space-y-2">
        {MOCK_NOTIFICATIONS.map((n) => {
          const Icon = ICON_MAP[n.type];
          return (
            <Card key={n.id} className={`transition-shadow hover:shadow-sm ${!n.read ? "border-primary/20 bg-primary/[0.02]" : ""}`}>
              <CardContent className="flex items-start gap-4 py-4">
                <span className={`mt-0.5 ${COLOR_MAP[n.type]}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{n.time}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
