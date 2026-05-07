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
import { Tabs } from "@/components/ui/tabs";
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

        <Tabs
          tabs={[
            {
              label: "Материалы",
              content: (
                <div className="space-y-4">
                  <Card className="rounded-2xl">
                    <CardContent className="space-y-3 py-6">
                      {contentBlocks.length > 0 ? contentBlocks.map((block, index) =>
                        block.type === "heading" ? (
                          <h2 key={`${block.text}-${index}`} className="text-lg font-semibold">{block.text}</h2>
                        ) : (
                          <p key={`${block.text}-${index}`} className="text-sm leading-6 text-muted-foreground">{block.text}</p>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground">Материалы урока пока не опубликованы.</p>
                      )}
                    </CardContent>
                  </Card>

                  {lesson.media.length > 0 ? (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Прикрепленные файлы</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {lesson.media.map((item) => (
                          <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted"
                          >
                            <FileText className="h-5 w-5 shrink-0 text-primary" />
                            <span className="text-sm">{item.filename ?? item.url}</span>
                          </a>
                        ))}
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              )
            },
            {
              label: lesson.quizzes.length > 0 ? `Тесты (${lesson.quizzes.length})` : "Тесты",
              content: lesson.quizzes.length > 0 ? (
                <div className="space-y-3">
                  {lesson.quizzes.map((quiz) => (
                    <Card key={quiz.id} className="transition-shadow hover:shadow-sm">
                      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{quiz.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {quiz.questionsCount} вопросов · порог {quiz.passThreshold}% · {quiz.maxAttempts} попытки
                          </p>
                        </div>
                        <Button asChild size="sm">
                          <Link href={`/student/quizzes/${quiz.id}`}>Пройти тест</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card><CardContent className="py-10 text-center text-muted-foreground">Тестов в этом уроке нет.</CardContent></Card>
              )
            },
            {
              label: "Задания",
              content: lesson.assignments.length > 0 ? (
                <div className="space-y-3">
                  {lesson.assignments.map((assignment) => (
                    <Card key={assignment.id} className="transition-shadow hover:shadow-sm">
                      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{assignment.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {assignment.deadline ? `Дедлайн: ${assignment.deadline.slice(0, 10)} · ` : ""}
                            {assignment.submissionStatus ? `Статус: ${assignment.submissionStatus}` : "Еще не отправлено"}
                          </p>
                        </div>
                        <Button asChild size="sm">
                          <Link href={`/student/assignments/${assignment.id}`}>Открыть</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card><CardContent className="py-10 text-center text-muted-foreground">Заданий в этом уроке нет.</CardContent></Card>
              )
            },
            {
              label: "Вопрос куратору",
              content: (
                <div className="space-y-4">
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-base">Задать вопрос куратору</CardTitle>
                      <CardDescription>Вопрос попадет назначенному куратору вашего потока.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <textarea
                        className="min-h-[100px] w-full resize-y rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Опишите вопрос по материалу урока..."
                        value={questionText}
                        onChange={(event) => setQuestionText(event.target.value)}
                      />
                      <div className="flex justify-end">
                        <Button onClick={askQuestion} disabled={sending || !questionText.trim()}>
                          <Send className="h-4 w-4" />
                          {sending ? "Отправка..." : "Отправить"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {lesson.myQuestions.length > 0 ? (
                    <>
                      <Separator />
                      <h2 className="text-sm font-medium">Мои вопросы по этому уроку</h2>
                      {lesson.myQuestions.map((question) => (
                        <Card key={question.id} className="transition-shadow hover:shadow-sm">
                          <CardContent className="py-4">
                            <div className="mb-2 flex items-center gap-2">
                              <MessageCircle className="h-4 w-4 text-primary" />
                              <Badge className={question.status === "open" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                                {question.status === "open" ? "Ожидает ответа" : "Отвечен"}
                              </Badge>
                            </div>
                            <p className="text-sm">{question.text}</p>
                            {question.answer ? (
                              <div className="mt-2 rounded-lg bg-emerald-50 p-3">
                                <p className="text-sm text-emerald-800">{question.answer}</p>
                              </div>
                            ) : null}
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  ) : null}
                </div>
              )
            }
          ]}
        />

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
