"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, MessageCircle, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { StudentLessonLearningDetail } from "@/types/domain";

function getContentBlocks(content: Record<string, unknown>) {
  const blocks = content.blocks;
  if (!Array.isArray(blocks)) {
    return [];
  }
  return blocks.flatMap((block) => {
    if (!block || typeof block !== "object" || !("text" in block)) {
      return [];
    }
    const typedBlock = block as { type?: unknown; text?: unknown };
    if (typeof typedBlock.text !== "string") {
      return [];
    }
    return [{ type: typeof typedBlock.type === "string" ? typedBlock.type : "paragraph", text: typedBlock.text }];
  });
}

export function StudentLessonView({ lesson }: { lesson: StudentLessonLearningDetail }) {
  const router = useRouter();
  const [questionText, setQuestionText] = useState("");
  const [sending, setSending] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressPercent, setProgressPercent] = useState(lesson.progressPercent);
  const contentBlocks = getContentBlocks(lesson.content);

  async function markCompleted() {
    setSavingProgress(true);
    const response = await fetch("/api/v1/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lessonId: lesson.id, percent: 100 })
    });
    setSavingProgress(false);
    if (response.ok) {
      setProgressPercent(100);
      router.refresh();
    }
  }

  async function askQuestion() {
    if (!questionText.trim()) {
      return;
    }
    setSending(true);
    const response = await fetch(`/api/v1/lessons/${lesson.id}/questions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: questionText })
    });
    setSending(false);
    if (response.ok) {
      setQuestionText("");
      router.refresh();
    }
  }

  return (
    <>
      <nav className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/student/my-courses" className="transition-colors hover:text-foreground">Мои курсы</Link>
        <span>/</span>
        <Link href={`/student/courses/${lesson.courseId}`} className="transition-colors hover:text-foreground">{lesson.courseTitle}</Link>
        <span>/</span>
        <span className="text-foreground">{lesson.moduleTitle}</span>
      </nav>

      <div className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge className="border-sky-200 bg-sky-50 text-sky-700">Урок {lesson.order}</Badge>
          <Badge className="border-primary/20 bg-primary/5 text-primary">{lesson.durationMinutes} мин.</Badge>
          {progressPercent >= 100 ? (
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Завершен</Badge>
          ) : null}
        </div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{lesson.title}</h1>
        {lesson.summary ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{lesson.summary}</p> : null}
      </div>

      <div className="space-y-6">
        {lesson.videoUrl ? (
          <Card className="overflow-hidden rounded-2xl">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src={lesson.videoUrl}
                title={lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </Card>
        ) : null}

        <Card>
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Прогресс урока</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} />
            </div>
            <Button size="sm" variant={progressPercent >= 100 ? "secondary" : "primary"} onClick={markCompleted} disabled={savingProgress || progressPercent >= 100}>
              {progressPercent >= 100 ? (
                <><CheckCircle2 className="h-4 w-4" /> Завершен</>
              ) : savingProgress ? "Сохраняем..." : "Отметить пройденным"}
            </Button>
          </CardContent>
        </Card>

        {/* Блок: Материалы */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-primary" />
            <h2 className="text-xl font-bold">Материалы урока</h2>
          </div>
          <Card className="rounded-3xl border-2">
            <CardContent className="space-y-4 py-8">
              {contentBlocks.length > 0 ? contentBlocks.map((block, index) =>
                block.type === "heading" ? (
                  <h2 key={`${block.text}-${index}`} className="text-xl font-bold mt-4">{block.text}</h2>
                ) : (
                  <p key={`${block.text}-${index}`} className="text-base leading-relaxed text-muted-foreground">{block.text}</p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">Материалы урока пока не опубликованы.</p>
              )}
            </CardContent>
          </Card>

          {lesson.media.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {lesson.media.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border-2 p-4 transition-all hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium">{item.filename ?? "Файл"}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.type}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-8" />

        {/* Блок: Тесты */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-primary" />
            <h2 className="text-xl font-bold">Проверка знаний</h2>
          </div>
          {lesson.quizzes.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {lesson.quizzes.map((quiz) => (
                <Card key={quiz.id} className="rounded-3xl border-2 transition-all hover:border-primary/20">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{quiz.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {quiz.questionsCount} вопр. · порог {quiz.passThreshold}%
                      </p>
                    </div>
                    <Button asChild size="sm" className="rounded-xl">
                      <Link href={`/student/quizzes/${quiz.id}`}>Пройти</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">В этом уроке нет тестов.</p>
          )}
        </div>

        <Separator className="my-8" />

        {/* Блок: Задания */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-primary" />
            <h2 className="text-xl font-bold">Практические задания</h2>
          </div>
          {lesson.assignments.length > 0 ? (
            <div className="grid gap-4">
              {lesson.assignments.map((assignment) => (
                <Card key={assignment.id} className="rounded-3xl border-2 transition-all hover:border-primary/20">
                  <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center">
                    <div className="flex-1 space-y-1">
                      <p className="text-lg font-bold">{assignment.title}</p>
                      <div className="flex flex-wrap gap-2">
                        {assignment.deadline && (
                          <Badge className="bg-secondary/50 text-[10px]">Дедлайн: {assignment.deadline.slice(0, 10)}</Badge>
                        )}
                        <Badge className={assignment.submissionStatus ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                          {assignment.submissionStatus ? `Статус: ${assignment.submissionStatus}` : "Не отправлено"}
                        </Badge>
                      </div>
                    </div>
                    <Button asChild className="rounded-xl">
                      <Link href={`/student/assignments/${assignment.id}`}>Открыть задание</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Практические задания отсутствуют.</p>
          )}
        </div>

        <Separator className="my-8" />

        {/* Блок: Вопрос куратору */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-primary" />
            <h2 className="text-xl font-bold">Поддержка</h2>
          </div>
          <Card className="rounded-3xl border-2 bg-primary/5 border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg text-primary">Задать вопрос куратору</CardTitle>
              <CardDescription>Опишите вашу проблему или вопрос по материалам урока.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                className="min-h-[120px] w-full resize-none rounded-2xl border-2 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Ваш вопрос..."
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
              />
              <div className="flex justify-end">
                <Button onClick={askQuestion} disabled={sending || !questionText.trim()} className="rounded-xl px-6">
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? "Отправка..." : "Отправить вопрос"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {lesson.myQuestions.length > 0 && (
            <div className="space-y-3 mt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">История вопросов</h3>
              {lesson.myQuestions.map((question) => (
                <Card key={question.id} className="rounded-2xl border shadow-sm">
                  <CardContent className="py-4">
                    <div className="mb-2 flex items-center justify-between">
                      <Badge className={question.status === "open" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
                        {question.status === "open" ? "Ожидает ответа" : "Отвечен"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" /> Вопрос по уроку
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{question.text}</p>
                    {question.answer && (
                      <div className="mt-3 rounded-xl bg-emerald-50/50 border border-emerald-100 p-4">
                        <p className="text-xs font-bold text-emerald-800 mb-1 uppercase tracking-tight">Ответ куратора:</p>
                        <p className="text-sm text-emerald-900">{question.answer}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          {lesson.prevLesson ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/student/lessons/${lesson.prevLesson.id}`}>
                <ArrowLeft className="h-4 w-4" />
                {lesson.prevLesson.title}
              </Link>
            </Button>
          ) : <div />}
          {lesson.nextLesson ? (
            lesson.nextLesson.locked ? (
              <Button size="sm" disabled title="Урок заблокирован">
                {lesson.nextLesson.title}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href={`/student/lessons/${lesson.nextLesson.id}`}>
                  {lesson.nextLesson.title}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )
          ) : null}
        </div>
      </div>
    </>
  );
}
