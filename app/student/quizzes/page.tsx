import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StudentQuizzesPage() {
  const user = await requireRolePage(["student"]);
  const prisma = getPrisma();
  
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: user.id },
    include: {
      quiz: { include: { course: true, lesson: true } }
    },
    orderBy: { startedAt: "desc" }
  });

  return (
    <AppShell role="student">
      <PageHeader title="Тесты" description="Список пройденных тестов." badge="Слушатель" />
      <div className="space-y-4 mt-6">
        {attempts.length > 0 ? (
          attempts.map((attempt) => (
            <Card key={attempt.id} className="rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{attempt.quiz.title}</CardTitle>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${attempt.passed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                    {attempt.passed ? "Сдан" : "Не сдан"}
                  </span>
                </div>
                <CardDescription>{attempt.quiz.course?.title} {attempt.quiz.lesson ? `· ${attempt.quiz.lesson.title}` : ""}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                Оценка: {attempt.score}% (Проходной: {attempt.quiz.passThreshold}%) · Дата: {new Date(attempt.startedAt).toLocaleDateString("ru-RU")}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="py-10 text-center text-muted-foreground">
              Вы еще не проходили тестов.
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
