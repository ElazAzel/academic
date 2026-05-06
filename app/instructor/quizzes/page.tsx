import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";

const MOCK_QUIZZES = [
  { id: "q1", title: "Тест: Основы AI-стратегии", lesson: "Урок 3", questions: 10, threshold: 80, attempts: 3 },
  { id: "q2", title: "Тест: Unit-экономика", lesson: "Урок 5", questions: 5, threshold: 80, attempts: 3 },
  { id: "q3", title: "Тест: Управление рисками", lesson: "Урок 6", questions: 8, threshold: 75, attempts: 2 },
];

export default function InstructorQuizzesPage() {
  return (
    <AppShell role="instructor">
      <PageHeader title="Конструктор тестов" description="Создание тестов, вопросов, вариантов ответа и autograding." badge="Преподаватель" />
      <div className="space-y-6">
        <Button><Plus className="h-4 w-4" />Создать тест</Button>
        <div className="space-y-3">
          {MOCK_QUIZZES.map((q) => (
            <Card key={q.id} className="transition-shadow hover:shadow-sm">
              <CardContent className="flex items-center gap-4 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{q.title}</p>
                  <p className="text-xs text-muted-foreground">{q.lesson} · {q.questions} вопросов · порог {q.threshold}% · {q.attempts} попытки</p>
                </div>
                <Button size="sm" variant="secondary">Редактировать</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
