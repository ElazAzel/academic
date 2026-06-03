"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

interface DeadlineAlert {
  studentId: string;
  studentName: string;
  cohortId: string;
  cohortName: string;
  courseTitle: string;
  blockId: string;
  blockTitle: string;
  dueAt: string;
  daysLeft: number;
  isOverdue: boolean;
}

export function DeadlineAlerts() {
  const { data: alerts = [] } = useQuery<DeadlineAlert[]>({
    queryKey: ["deadline-alerts"],
    queryFn: async () => {
      const res = await fetch("/api/v1/deadline-alerts");
      if (!res.ok) throw new Error("Не удалось загрузить дедлайны");
      const json = await res.json();
      return json.data ?? [];
    },
    refetchInterval: 60_000, // Refresh every minute
  });

  if (alerts.length === 0) return null;

  const overdue = alerts.filter((a) => a.isOverdue);
  const upcoming = alerts.filter((a) => !a.isOverdue && a.daysLeft <= 7);

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Напоминания о дедлайнах
          {overdue.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {overdue.length} просрочено
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {overdue.slice(0, 5).map((alert, i) => (
          <div key={`overdue-${i}`} className="flex items-start gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <span className="font-medium">{alert.studentName}</span>
              <span className="text-muted-foreground">
                {" — "} {alert.blockTitle} ({alert.courseTitle})
              </span>
              <div className="text-xs text-destructive">
                Просрочен на {Math.abs(alert.daysLeft)} дн.
              </div>
            </div>
          </div>
        ))}
        {upcoming.slice(0, 5).map((alert, i) => (
          <div key={`upcoming-${i}`} className="flex items-start gap-2 text-sm">
            <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <span className="font-medium">{alert.studentName}</span>
              <span className="text-muted-foreground">
                {" — "} {alert.blockTitle} ({alert.courseTitle})
              </span>
              <div className="text-xs text-muted-foreground">
                {alert.daysLeft === 0
                  ? "Сегодня"
                  : alert.daysLeft === 1
                    ? "Завтра"
                    : `Через ${alert.daysLeft} дн.`}
                {" · "}
                {format(parseISO(alert.dueAt), "d MMM", { locale: ru })}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
