import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, FileText } from "lucide-react";
import Link from "next/link";

export default function StudentQuizPage({ params }: { params: { quizId: string } }) {
  const MOCK_QUESTIONS = [
    { id: "q1", text: "Что такое ROI в контексте AI-проекта?", options: ["Доход", "Возврат инвестиций", "Риск", "Капитал"], correct: 1 },
    { id: "q2", text: "Какой ключевой фактор влияет на TCO AI-решения?", options: ["Цвет логотипа", "Стоимость инференса", "Название проекта", "Размер команды"], correct: 1 },
    { id: "q3", text: "Что означает sequential traversal mode?", options: ["Уроки в любом порядке", "Уроки по порядку", "Только видео", "Только тесты"], correct: 1 },
  ];

  return (
    <AppShell role="student">
      <div className="mb-4">
        <Link href="/student/my-courses"><Button size="sm" variant="secondary"><ArrowLeft className="h-4 w-4" />Назад к курсу</Button></Link>
      </div>
      <PageHeader title="Тест: Unit-экономика" description={`Тест ${params.quizId} · 3 вопроса · порог 80% · 3 попытки`} badge="Тест" />
      <div className="space-y-4">
        {MOCK_QUESTIONS.map((q, i) => (
          <Card key={q.id} className="rounded-2xl">
            <CardContent className="py-5 space-y-3">
              <p className="text-sm font-medium">{i + 1}. {q.text}</p>
              <div className="space-y-2">
                {q.options.map((opt, j) => (
                  <label key={j} className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer hover:bg-muted transition-colors">
                    <input type="radio" name={q.id} className="h-4 w-4 text-primary" />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <Button>
            <CheckCircle2 className="h-4 w-4" />
            Отправить ответы
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
