"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  MessageCircle,
  Send,
} from "lucide-react";
import type { LessonDetail, ProgressStatus } from "@/types/domain";

type LessonQuestion = {
  id: string;
  text: string;
  status: "open" | "answered";
  createdAt: string;
  answer: string | null;
};

type StudentLessonView = Omit<LessonDetail, "progressPercent" | "progressStatus"> & {
  progressPercent: number;
  progressStatus: ProgressStatus;
  moduleTitle: string;
  courseTitle: string;
  courseId: string;
  prevLesson: { id: string; title: string } | null;
  nextLesson: { id: string; title: string } | null;
  myQuestions: LessonQuestion[];
};

// TODO: Replace with getLessonForStudent(lessonId)
function getMockLesson(lessonId: string): StudentLessonView {
  const progressStatus: ProgressStatus = "IN_PROGRESS";

  return {
    id: lessonId,
    order: 2,
    title: "Unit-экономика AI",
    summary: "Как рассчитать возврат инвестиций от AI-проектов. Модели оценки ROI, unit-экономика, TCO.",
    type: "VIDEO_DOCUMENT" as const,
    durationMinutes: 40,
    isRequired: true,
    progressStatus,
    progressPercent: 60,
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    content: {
      blocks: [
        { type: "heading", text: "Ключевые концепции" },
        { type: "paragraph", text: "Unit-экономика AI-проекта складывается из стоимости инференса, стоимости разработки и обслуживания, а также ожидаемого бизнес-эффекта." },
        { type: "paragraph", text: "Формула ROI для AI-проекта: (Выгода - Затраты) / Затраты × 100%" },
        { type: "heading", text: "Пример расчёта" },
        { type: "paragraph", text: "Компания внедрила AI-ассистента для поддержки клиентов. Стоимость разработки: $50,000. Ежемесячная экономия: $15,000. Срок окупаемости: 3.3 месяца." },
      ],
    },
    media: [
      { id: "media-1", type: "pdf", url: "/uploads/unit-economics-slides.pdf", filename: "Слайды: Unit-экономика AI.pdf" },
    ],
    quizzes: [
      { id: "quiz-1", title: "Тест: Unit-экономика", passThreshold: 80, maxAttempts: 3, questionsCount: 5 },
    ],
    assignments: [] as Array<{ id: string; title: string; deadline: string | null; maxAttempts: number }>,
    moduleTitle: "Модуль 2: Практика",
    courseTitle: "AI Strategy Fundamentals",
    courseId: "c1",
    prevLesson: { id: "l4", title: "ROI от AI-проектов" },
    nextLesson: { id: "l6", title: "Управление рисками AI" },
    myQuestions: [
      { id: "q1", text: "Как рассчитать ROI от внедрения AI-ассистента?", status: "open", createdAt: "2026-05-06T14:30:00Z", answer: null },
    ],
  };
}

export default function StudentLessonPage({ params }: { params: { lessonId: string } }) {
  const lesson = getMockLesson(params.lessonId);
  const [questionText, setQuestionText] = useState("");
  const [sending, setSending] = useState(false);

  const handleAskQuestion = async () => {
    if (!questionText.trim()) return;
    setSending(true);
    // TODO: askCuratorQuestion(lesson.id, questionText)
    setTimeout(() => {
      setSending(false);
      setQuestionText("");
    }, 1000);
  };

  return (
    <AppShell role="student">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/student/my-courses" className="hover:text-foreground transition-colors">Мои курсы</Link>
        <span>/</span>
        <Link href={`/student/courses/${lesson.courseId}`} className="hover:text-foreground transition-colors">{lesson.courseTitle}</Link>
        <span>/</span>
        <span className="text-foreground">{lesson.moduleTitle}</span>
      </nav>

      {/* Заголовок */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge className="border-sky-200 bg-sky-50 text-sky-700">Урок {lesson.order}</Badge>
          <Badge className="border-primary/20 bg-primary/5 text-primary">{lesson.durationMinutes} мин.</Badge>
          {lesson.progressStatus === "COMPLETED" && (
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Завершён</Badge>
          )}
        </div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{lesson.title}</h1>
        {lesson.summary && <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{lesson.summary}</p>}
      </div>

      <div className="space-y-6">
        {/* Видео */}
        {lesson.videoUrl && (
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
        )}

        {/* Прогресс урока */}
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Прогресс урока</span>
                <span className="font-medium">{lesson.progressPercent}%</span>
              </div>
              <Progress value={lesson.progressPercent} />
            </div>
            <Button size="sm" variant={lesson.progressPercent >= 100 ? "secondary" : "primary"}>
              {lesson.progressPercent >= 100 ? (
                <><CheckCircle2 className="h-4 w-4" /> Завершён</>
              ) : (
                <>Отметить просмотренным</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Контент + доп. блоки */}
        <Tabs tabs={[
          {
            label: "Материалы",
            content: (
              <div className="space-y-4">
                {/* Текстовый контент */}
                <Card className="rounded-2xl">
                  <CardContent className="prose prose-sm max-w-none py-6">
                    {(lesson.content.blocks as Array<{ type: string; text: string }>).map((block, i) =>
                      block.type === "heading" ? (
                        <h3 key={i} className="text-lg font-semibold mt-4 first:mt-0">{block.text}</h3>
                      ) : (
                        <p key={i} className="text-sm text-muted-foreground leading-relaxed">{block.text}</p>
                      )
                    )}
                  </CardContent>
                </Card>

                {/* Файлы */}
                {lesson.media.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Прикреплённые файлы</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {lesson.media.map((m) => (
                        <a
                          key={m.id}
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted"
                        >
                          <FileText className="h-5 w-5 text-primary shrink-0" />
                          <span className="text-sm">{m.filename ?? m.url}</span>
                        </a>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            ),
          },
          {
            label: lesson.quizzes.length > 0 ? `Тест (${lesson.quizzes.length})` : "Тест",
            content: lesson.quizzes.length > 0 ? (
              <div className="space-y-3">
                {lesson.quizzes.map((q) => (
                  <Card key={q.id} className="transition-shadow hover:shadow-sm">
                    <CardContent className="flex items-center gap-4 py-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{q.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {q.questionsCount} вопросов · порог {q.passThreshold}% · {q.maxAttempts} попытки
                        </p>
                      </div>
                      <Button size="sm">Пройти тест</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card><CardContent className="py-10 text-center text-muted-foreground">Тестов в этом уроке нет.</CardContent></Card>
            ),
          },
          {
            label: "Задать вопрос",
            content: (
              <div className="space-y-4">
                {/* Форма вопроса */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Задать вопрос куратору</CardTitle>
                    <CardDescription>Куратор ответит в течение 24 часов.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <textarea
                      className="w-full rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px] resize-y"
                      placeholder="Опишите ваш вопрос по материалу урока..."
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleAskQuestion} disabled={sending || !questionText.trim()}>
                        <Send className="h-4 w-4" />
                        {sending ? "Отправка..." : "Отправить"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Мои вопросы */}
                {lesson.myQuestions.length > 0 && (
                  <>
                    <Separator />
                    <h3 className="text-sm font-medium">Мои вопросы по этому уроку</h3>
                    {lesson.myQuestions.map((q) => (
                      <Card key={q.id} className="transition-shadow hover:shadow-sm">
                        <CardContent className="py-4">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageCircle className="h-4 w-4 text-primary" />
                            <Badge className={q.status === "open" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                              {q.status === "open" ? "Ожидает ответа" : "Отвечен"}
                            </Badge>
                          </div>
                          <p className="text-sm">{q.text}</p>
                          {q.answer && (
                            <div className="mt-2 rounded-lg bg-emerald-50 p-3">
                              <p className="text-sm text-emerald-800">{q.answer}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            ),
          },
        ]} />

        {/* Навигация между уроками */}
        <div className="flex items-center justify-between pt-2">
          {lesson.prevLesson ? (
            <Link href={`/student/lessons/${lesson.prevLesson.id}`}>
              <Button variant="secondary" size="sm">
                <ArrowLeft className="h-4 w-4" />
                {lesson.prevLesson.title}
              </Button>
            </Link>
          ) : (
            <div />
          )}
          {lesson.nextLesson && (
            <Link href={`/student/lessons/${lesson.nextLesson.id}`}>
              <Button size="sm">
                {lesson.nextLesson.title}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </AppShell>
  );
}
