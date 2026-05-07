import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function QuizResultPage({ params }: { params: Promise<{ quizId: string }> }) {
  const user = await requireRolePage(["student"]);
  const { quizId } = await params;
  const prisma = getPrisma();

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { lesson: true }
  });

  if (!quiz) notFound();

  const attempt = await prisma.quizAttempt.findFirst({
    where: { quizId, userId: user.id },
    orderBy: { createdAt: "desc" }
  });

  if (!attempt) {
    return (
      <AppShell role="student">
        <div className="text-center py-20">
          <p>Попыток не найдено.</p>
          <Button asChild className="mt-4">
            <Link href={`/student/quizzes/${quizId}`}>Пройти тест</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const passed = attempt.score >= quiz.passThreshold;

  return (
    <AppShell role="student">
      <div className="mb-4">
        <Button asChild size="sm" variant="secondary">
          <Link href={`/student/lessons/${quiz.lessonId}`}>
            <ArrowLeft className="h-4 w-4" />
            Назад к уроку
          </Link>
        </Button>
      </div>
      
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="rounded-3xl border-2 overflow-hidden">
          <div className={`h-2 ${passed ? "bg-emerald-500" : "bg-rose-500"}`} />
          <CardHeader className="text-center pt-8">
            <div className="flex justify-center mb-4">
              {passed ? (
                <div className="bg-emerald-100 p-4 rounded-full">
                  <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                </div>
              ) : (
                <div className="bg-rose-100 p-4 rounded-full">
                  <XCircle className="h-12 w-12 text-rose-600" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl">
              {passed ? "Тест успешно пройден!" : "Тест не пройден"}
            </CardTitle>
            <p className="text-muted-foreground">
              Ваш результат: {attempt.score}%
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pb-10 px-10">
            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Проходной балл: {quiz.passThreshold}%</span>
                <span className="font-bold">{attempt.score}%</span>
              </div>
              <Progress value={attempt.score} className={passed ? "bg-emerald-100" : "bg-rose-100"} />
            </div>

            <div className="bg-muted/50 rounded-2xl p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Всего вопросов:</span>
                <span>{quiz.questionsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Правильных ответов:</span>
                <span className="font-medium text-emerald-600">{Math.round((attempt.score / 100) * quiz.questionsCount)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              {passed ? (
                <Button asChild className="w-full h-12 rounded-xl">
                  <Link href={`/student/courses/${quiz.courseId}`}>Продолжить обучение</Link>
                </Button>
              ) : (
                <Button asChild className="w-full h-12 rounded-xl">
                  <Link href={`/student/quizzes/${quizId}`}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Попробовать еще раз
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
