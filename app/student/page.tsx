import { AppShell } from "@/components/layout/app-shell";
import { ContinueLearningCard, CourseProgressGrid, MetricGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { getStudentDashboard } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";
import {
  getStudentMetrics,
  MOCK_CONTINUE_LEARNING,
  MOCK_STUDENT_PROGRESS,
  MOCK_QUESTIONS,
} from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  await requireRolePage(["student"]);
  const data = await getStudentDashboard();
  const demoMode = isDemoModeEnabled();

  if (!data && !demoMode) {
    return (
      <AppShell role="student">
        <PageHeader
          title="Дашборд слушателя"
          description="Ваш прогресс, курсы, задания и уведомления."
          badge="Слушатель"
        />
        <DashboardUnavailable />
      </AppShell>
    );
  }
  
  const metrics = data?.metrics ?? [];
  const continueLearning = data?.continueLearning ?? null;
  const coursesProgress = data?.coursesProgress ?? [];
  const questions = data?.questions ?? [];

  const answeredQuestions = questions.filter((q) => q.status === "answered");

  return (
    <AppShell role="student">
      <PageHeader
        title="Дашборд слушателя"
        description="Ваш прогресс, курсы, задания и уведомления."
        badge="Слушатель"
      />
      <div className="space-y-6">
        <MetricGrid metrics={metrics} />

        {continueLearning && <ContinueLearningCard data={continueLearning} />}

        <Tabs
          tabs={[
            {
              label: "Мои курсы",
              content: <CourseProgressGrid courses={coursesProgress} />,
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
          ]}
        />
      </div>
    </AppShell>
  );
}
