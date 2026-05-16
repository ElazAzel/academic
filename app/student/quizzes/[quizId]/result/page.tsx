import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw, HelpCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function normalizeAnswer(ans: unknown): string {
  if (typeof ans === "string") return ans;
  if (ans && typeof ans === "object" && "value" in (ans as object)) return (ans as { value: string }).value;
  return String(ans ?? "");
}

export default async function QuizResultPage({ params }: { params: Promise<{ quizId: string }> }) {
  const user = await requireRolePage(["student"]);
  const { quizId } = await params;
  const prisma = getPrisma();

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      lesson: true,
      questions: { orderBy: { order: "asc" } },
      _count: { select: { questions: true } },
    },
  });

  if (!quiz) notFound();

  const attempt = await prisma.quizAttempt.findFirst({
    where: { quizId, userId: user.id },
    orderBy: { startedAt: "desc" },
  });

  if (!attempt) {
    return (
      <AppShell role="student">
        <div className="text-center py-20">
          <p className="text-muted-foreground">Попыток не найдено.</p>
          <Button asChild className="mt-4">
            <Link href={`/student/quizzes/${quizId}`}>Пройти тест</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const passed = attempt.score >= quiz.passThreshold;
  const answers = attempt.answers as Record<string, string>;
  const correctCount = quiz.questions.filter((q) => {
    const studentAnswer = answers[q.id];
    const correctAnswer = normalizeAnswer(q.correctAnswer);
    return studentAnswer === correctAnswer;
  }).length;
  const totalQuestions = quiz.questions.length;

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
        {/* Result card */}
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
              <Progress
                value={attempt.score}
                className={passed ? "bg-emerald-100" : "bg-rose-100"}
              />
            </div>

            <div className="bg-muted/50 rounded-2xl p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Всего вопросов:</span>
                <span>{totalQuestions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Правильных ответов:</span>
                <span className="font-medium text-emerald-600">{correctCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Неправильных:</span>
                <span className="font-medium text-rose-600">{totalQuestions - correctCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Попытка:</span>
                <span>1</span>
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

        {/* Detailed answer review */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              Разбор ответов
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quiz.questions.map((q, i) => {
              const studentAnswer = answers[q.id];
              const correctAnswer = normalizeAnswer(q.correctAnswer);
              const isCorrect = studentAnswer === correctAnswer;
              const options = q.options as string[];

              return (
                <div
                  key={q.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isCorrect
                      ? "border-emerald-200 bg-emerald-50/30"
                      : "border-rose-200 bg-rose-50/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-rose-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-sm font-medium">
                        {i + 1}. {q.prompt}
                      </p>

                      {/* Options */}
                      {options.length > 0 && (
                        <div className="space-y-1">
                          {options.map((opt) => {
                            const isSelected = studentAnswer === opt;
                            const isCorrectOpt = correctAnswer === opt;
                            let optClass = "border-muted bg-card text-muted-foreground";

                            if (isSelected && isCorrectOpt) {
                              optClass = "border-emerald-300 bg-emerald-100 text-emerald-800";
                            } else if (isSelected && !isCorrectOpt) {
                              optClass = "border-rose-300 bg-rose-100 text-rose-800";
                            } else if (!isSelected && isCorrectOpt) {
                              optClass = "border-emerald-200 bg-emerald-50 text-emerald-700";
                            }

                            return (
                              <div
                                key={opt}
                                className={`rounded-lg border px-3 py-1.5 text-xs ${optClass}`}
                              >
                                {opt}
                                {isSelected && !isCorrectOpt && (
                                  <span className="ml-2 text-rose-600">← ваш ответ</span>
                                )}
                                {!isSelected && isCorrectOpt && (
                                  <span className="ml-2 text-emerald-600">✓ правильный ответ</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.type === "TEXT" && (
                        <div className="space-y-1 text-xs">
                          <p className="text-muted-foreground">
                            Ваш ответ: <span className={isCorrect ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>{studentAnswer ?? "—"}</span>
                          </p>
                          {!isCorrect && (
                            <p className="text-emerald-600">
                              Правильный ответ: <span className="font-medium">{correctAnswer}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
