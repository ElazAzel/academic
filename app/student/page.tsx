import { AppShell } from "@/components/layout/app-shell";
import { ContinueLearningCard, CourseProgressGrid, MetricGrid, QuestionsQueue } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock } from "lucide-react";
import {
  getStudentMetrics,
  MOCK_CONTINUE_LEARNING,
  MOCK_STUDENT_PROGRESS,
  MOCK_QUESTIONS,
} from "@/lib/mock-data";

export default function StudentDashboardPage() {
  const metrics = getStudentMetrics();
  const openQuestions = MOCK_QUESTIONS.filter((q) => q.status === "open");
  const answeredQuestions = MOCK_QUESTIONS.filter((q) => q.status === "answered");

  return (
    <AppShell role="student">
      <PageHeader
        title="Дашборд слушателя"
        description="Ваш прогресс, курсы, задания и уведомления."
        badge="Слушатель"
      />
      <div className="space-y-6">
        <MetricGrid metrics={metrics} />

        <ContinueLearningCard data={MOCK_CONTINUE_LEARNING} />

        <Tabs
          tabs={[
            {
              label: "Мои курсы",
              content: <CourseProgressGrid courses={MOCK_STUDENT_PROGRESS} />,
            },
            {
              label: "Ответы куратора",
              content: (
                <div className="space-y-4">
                  {answeredQuestions.length > 0 ? (
                    answeredQuestions.map((q) => (
                      <Card key={q.id} className="transition-shadow hover:shadow-sm">
                        <CardContent className="py-4">
                          <p className="text-sm font-medium">{q.text}</p>
                          <div className="mt-2 rounded-lg bg-emerald-50 p-3">
                            <p className="text-sm text-emerald-800">{q.answer}</p>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {q.courseTitle} → {q.lessonTitle}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="py-10 text-center text-muted-foreground">
                        Пока нет ответов от куратора.
                      </CardContent>
                    </Card>
                  )}
                </div>
              ),
            },
            {
              label: "Дедлайны",
              content: (
                <div className="space-y-3">
                  <Card className="transition-shadow hover:shadow-sm">
                    <CardContent className="flex items-center gap-4 py-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                        <Clock className="h-5 w-5 text-amber-600" aria-hidden />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Модуль 2: Практика</p>
                        <p className="text-xs text-muted-foreground">
                          AI Strategy Fundamentals · до 18 мая 2026
                        </p>
                      </div>
                      <Badge className="border-amber-200 bg-amber-50 text-amber-700">11 дн.</Badge>
                    </CardContent>
                  </Card>
                  <Card className="transition-shadow hover:shadow-sm">
                    <CardContent className="flex items-center gap-4 py-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100">
                        <Clock className="h-5 w-5 text-sky-600" aria-hidden />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Модуль 1: Основы</p>
                        <p className="text-xs text-muted-foreground">
                          Prompt Engineering for Leaders · до 25 мая 2026
                        </p>
                      </div>
                      <Badge className="border-sky-200 bg-sky-50 text-sky-700">18 дн.</Badge>
                    </CardContent>
                  </Card>
                </div>
              ),
            },
            {
              label: "Уведомления",
              content: (
                <div className="space-y-3">
                  {[
                    { title: "Новый ответ куратора", desc: "Куратор ответил на ваш вопрос по Unit-экономике", time: "2 ч. назад" },
                    { title: "Дедлайн приближается", desc: "Модуль 2 нужно пройти до 18 мая", time: "1 дн. назад" },
                    { title: "Новый урок доступен", desc: "Урок 3 открыт для прохождения", time: "2 дн. назад" },
                  ].map((n, i) => (
                    <Card key={i} className="transition-shadow hover:shadow-sm">
                      <CardContent className="flex items-center gap-4 py-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          <Bell className="h-5 w-5 text-primary" aria-hidden />
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground">{n.desc}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{n.time}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
