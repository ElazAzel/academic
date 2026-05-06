import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";

const MOCK_ASSIGNMENTS = [
  { id: "a1", title: "План внедрения AI", lesson: "Урок 7", maxAttempts: 2, deadline: "2026-05-20", pending: 5 },
  { id: "a2", title: "Финальный проект: AI-стратегия", lesson: "Урок 9", maxAttempts: 1, deadline: "2026-06-01", pending: 0 },
];

export default function InstructorAssignmentsPage() {
  return (
    <AppShell role="instructor">
      <PageHeader title="Конструктор заданий" description="Инструкции, дедлайны, критерии и проверка попыток." badge="Преподаватель" />
      <div className="space-y-6">
        <Button><Plus className="h-4 w-4" />Создать задание</Button>
        <div className="space-y-3">
          {MOCK_ASSIGNMENTS.map((a) => (
            <Card key={a.id} className="transition-shadow hover:shadow-sm">
              <CardContent className="flex items-center gap-4 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 shrink-0">
                  <FileText className="h-5 w-5 text-amber-600" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.lesson} · макс. {a.maxAttempts} попытки · до {a.deadline}</p>
                </div>
                {a.pending > 0 && <Badge className="border-amber-200 bg-amber-50 text-amber-700">{a.pending} на проверку</Badge>}
                <Button size="sm" variant="secondary">Редактировать</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
