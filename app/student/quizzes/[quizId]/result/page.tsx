import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw, HelpCircle, Clock, History } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function resolveOptionLabel(val: unknown, options: unknown[]): string {
  if (val === null || val === undefined) return "";
  const strVal = String(val);

  if (Array.isArray(options) && options.length > 0) {
    // Numeric index → option
    const idx = parseInt(strVal, 10);
    if (!isNaN(idx) && idx >= 0 && idx < options.length && String(idx) === strVal) {
      const opt = options[idx];
      if (typeof opt === "object" && opt !== null) {
        const o = opt as Record<string, unknown>;
        return String(o.label ?? o.id ?? strVal);
      }
      return String(opt);
    }

    // ID match on object options
    if (typeof options[0] === "object" && options[0] !== null) {
      const firstOpt = options[0] as Record<string, unknown>;
      if ("id" in firstOpt) {
        const matched = (options as Array<Record<string, unknown>>).find(
          (o) => String(o.id) === strVal
        );
        if (matched) return String(matched.label ?? matched.id);
      }
    }
  }

  return strVal;
}

function resolveCorrectAnswer(correct: unknown, options: unknown[]): string[] {
  if (correct === null || correct === undefined) return [];

  let rawExpected: unknown;
  if (typeof correct === "object" && !Array.isArray(correct)) {
    const obj = correct as Record<string, unknown>;
    if ("values" in obj) {
      rawExpected = obj.values;
    } else if ("value" in obj) {
      rawExpected = obj.value;
    } else if ("index" in obj) {
      rawExpected = obj.index;
    } else {
      rawExpected = correct;
    }
  } else {
    rawExpected = correct;
  }

  const vals = Array.isArray(rawExpected) ? rawExpected : [rawExpected];
  return vals.map((v) => resolveOptionLabel(v, options)).sort();
}

function resolveStudentAnswer(actual: unknown, options: unknown[]): string[] {
  if (actual === null || actual === undefined) return [];
  const vals = Array.isArray(actual) ? actual : [actual];
  return vals.map((v) => resolveOptionLabel(v, options)).sort();
}

function isAnswerCorrect(studentAnsStrs: string[], correctStrs: string[]): boolean {
  if (studentAnsStrs.length !== correctStrs.length) return false;
  return studentAnsStrs.every((val, index) => val === correctStrs[index]);
}

export default async function QuizResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ quizId: string }>;
  searchParams?: Promise<{ attemptId?: string }>;
}) {
  const user = await requireRolePage(["student"]);
  const { quizId } = await params;
  const sp = await searchParams;
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

  const allAttempts = await prisma.quizAttempt.findMany({
    where: { quizId, userId: user.id },
    orderBy: { startedAt: "desc" },
  });

  const attempt = sp?.attemptId
    ? allAttempts.find((a) => a.id === sp.attemptId) ?? allAttempts[0] ?? null
    : allAttempts[0] ?? null;

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

  const currentAttemptNumber = allAttempts.length;
  const passed = attempt.score >= quiz.passThreshold;
  const courseHref = quiz.courseId ? `/student/courses/${quiz.courseId}` : "/student/my-courses";
  const lessonHref = quiz.lessonId ? `/student/lessons/${quiz.lessonId}` : courseHref;
  const answers = (attempt.answers ?? {}) as Record<string, unknown>;
  const correctCount = quiz.questions.filter((q) => {
    const opts = Array.isArray(q.options) ? q.options : [];
    const studentStrs = resolveStudentAnswer(answers[q.id], opts);
    const correctStrs = resolveCorrectAnswer(q.correctAnswer, opts);
    return isAnswerCorrect(studentStrs, correctStrs);
  }).length;
  const totalQuestions = quiz.questions.length;

  return (
    <AppShell role="student">
      <div className="mb-4">
        <Button asChild size="sm" variant="secondary">
          <Link href={lessonHref}>
            <ArrowLeft className="h-4 w-4" />
            К уроку
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
                <span>{currentAttemptNumber}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              {passed ? (
                <Button asChild className="w-full h-12 rounded-xl">
                  <Link href={lessonHref}>Вернуться к уроку</Link>
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
              const opts = Array.isArray(q.options) ? q.options : [];
              const studentAnswerStrs = resolveStudentAnswer(studentAnswer, opts);
              const correctStrs = resolveCorrectAnswer(q.correctAnswer, opts);
              const isCorrect = isAnswerCorrect(studentAnswerStrs, correctStrs);
              
              const rawOptions = Array.isArray(q.options) ? q.options : [];
              const options = rawOptions.map((o) => {
                if (o && typeof o === "object") {
                  const obj = o as Record<string, unknown>;
                  return String(obj.label ?? obj.id ?? JSON.stringify(o));
                }
                return String(o);
              });

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
                            const isSelected = studentAnswerStrs.includes(opt);
                            const isCorrectOpt = correctStrs.includes(opt);
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
                            Ваш ответ: <span className={isCorrect ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>{studentAnswerStrs.join(", ") || "—"}</span>
                          </p>
                          {!isCorrect && (
                            <p className="text-emerald-600">
                              Правильный ответ: <span className="font-medium">{correctStrs.join(", ") || "—"}</span>
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

        {/* Attempt history */}
        {allAttempts.length > 1 && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                История попыток
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allAttempts.map((att, idx) => {
                  const attemptNum = allAttempts.length - idx;
                  return (
                    <div
                      key={att.id}
                      className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${
                        att.id === attempt.id ? "border-primary/30 bg-primary/5" : "border-muted"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`shrink-0 rounded-full p-1.5 ${(att.score ?? 0) >= quiz.passThreshold ? "bg-emerald-100" : "bg-rose-100"}`}>
                          {(att.score ?? 0) >= quiz.passThreshold ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Попытка #{attemptNum}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {att.submittedAt
                              ? new Date(att.submittedAt).toLocaleDateString("ru-RU", {
                                  day: "numeric",
                                  month: "long",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : new Date(att.startedAt).toLocaleDateString("ru-RU", {
                                  day: "numeric",
                                  month: "long",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-sm font-bold ${(att.score ?? 0) >= quiz.passThreshold ? "text-emerald-600" : "text-rose-600"}`}>
                          {att.score}%
                        </span>
                        {att.id !== attempt.id && (
                          <Button asChild size="sm" variant="ghost" className="h-8">
                            <Link href={`/student/quizzes/${quizId}/result?attemptId=${att.id}`}>Просмотр</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
