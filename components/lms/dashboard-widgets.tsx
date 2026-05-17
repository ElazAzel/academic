"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, FileText, MessageCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/lms/status-badge";
import type { BadgeStatus } from "@/components/lms/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Stagger, CardHover, FadeIn } from "@/components/lms/animations";
import dynamic from "next/dynamic";

const AnswerQuestionModal = dynamic(
  () => import("./curator-modals").then((m) => ({ default: m.AnswerQuestionModal })),
  { ssr: false },
);

const ReviewSubmissionModal = dynamic(
  () => import("./curator-modals").then((m) => ({ default: m.ReviewSubmissionModal })),
  { ssr: false },
);
import type {
  ContinueLearning,
  CourseSummary,
  CuratorLoad,
  DashboardMetric,
  QuestionFromStudent,
  RiskItem,
  StudentProgress,
  SubmissionForReview,
} from "@/types/domain";
import { RISK_LABELS } from "@/types/domain";

// ── Метрики ─────────────────────────────────────────────────────────
const TONE_CLASSES: Record<DashboardMetric["tone"], string> = {
  primary: "text-primary",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-destructive",
  info: "text-sky-600 dark:text-sky-400",
};

export function MetricGrid({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <Stagger className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        <FadeIn key={m.label}>
          <CardHover>
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">{m.label}</CardDescription>
                <CardTitle className={`text-3xl font-semibold ${TONE_CLASSES[m.tone]}`}>
                  {m.value}
                </CardTitle>
              </CardHeader>
              {m.change && (
                <CardContent>
                  <p className="text-xs text-muted-foreground">{m.change}</p>
                </CardContent>
              )}
            </Card>
          </CardHover>
        </FadeIn>
      ))}
    </Stagger>
  );
}

// ── Продолжить обучение ─────────────────────────────────────────────
export function ContinueLearningCard({ data }: { data: ContinueLearning }) {
  return (
    <FadeIn>
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent transition-shadow hover:shadow-panel">
      <CardHeader>
        <StatusBadge status="ACTIVE" label="Следующее действие" className="w-fit" />
        <CardTitle className="text-xl">Продолжить: {data.courseTitle}</CardTitle>
        <CardDescription>
          {data.moduleTitle} · {data.lessonTitle}
          {data.deadlineDaysLeft != null && ` · дедлайн через ${data.deadlineDaysLeft} дн.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Прогресс курса</span>
            <span className="font-medium">{data.coursePercent}%</span>
          </div>
          <Progress value={data.coursePercent} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Прогресс модуля</span>
            <span className="font-medium">{data.modulePercent}%</span>
          </div>
          <Progress value={data.modulePercent} className="h-1.5" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            До сертификата: пройти {100 - data.coursePercent}% курса и сдать финальное задание.
          </p>
          <Button asChild>
            <Link href={`/student/lessons/${data.lessonId}`}>
            Открыть урок
            <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
    </FadeIn>
  );
}

// ── Сетка курсов с прогрессом ───────────────────────────────────────
export function CourseProgressGrid({ courses }: { courses: StudentProgress[] }) {
  return (
    <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <FadeIn key={c.courseId}>
        <CardHover>
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <StatusBadge status={c.status as BadgeStatus} />
              <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
            <CardTitle className="text-base">{c.courseTitle}</CardTitle>
            <CardDescription>
              {c.currentModuleTitle && `${c.currentModuleTitle}`}
              {c.currentLessonTitle && ` → ${c.currentLessonTitle}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={c.percent} />
            <Button asChild className="mt-3 w-full" size="sm" variant="secondary">
              <Link href={c.nextLessonId ? `/student/lessons/${c.nextLessonId}` : `/student/courses/${c.courseId}`}>
                {c.nextLessonId ? "Продолжить" : "Открыть курс"}
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">{c.percent}% завершено</p>
          </CardContent>
        </Card>
        </CardHover>
        </FadeIn>
      ))}
    </Stagger>
  );
}

// ── Сетка курсов (для инструктора/админа) ───────────────────────────
export function CourseManageGrid({
  courses,
  builderBasePath = "/instructor/courses",
}: {
  courses: CourseSummary[];
  builderBasePath?: "/instructor/courses" | "/admin/courses";
}) {
  return (
    <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <FadeIn key={c.id}>
          <CardHover>
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
              <StatusBadge status={c.status as BadgeStatus} />
                </div>
                <CardTitle className="text-base">{c.title}</CardTitle>
                <CardDescription>{c.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{c.modulesCount} модулей</span>
                  <span>{c.lessonsCount} уроков</span>
                  <span>{c.durationHours} ч.</span>
                </div>
                {c.instructors.length > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <Avatar name={c.instructors[0].name} className="h-6 w-6 text-[10px]" />
                    <span className="text-xs text-muted-foreground">{c.instructors[0].name}</span>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t">
                  <Button asChild variant="secondary" size="sm" className="w-full">
                    <Link href={`${builderBasePath}/${c.id}/builder`}>Управление курсом</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </CardHover>
        </FadeIn>
      ))}
    </Stagger>
  );
}

// ── Очередь вопросов ────────────────────────────────────────────────
export function QuestionsQueue({ questions }: { questions: QuestionFromStudent[] }) {
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionFromStudent | null>(null);

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <MessageCircle className="mx-auto h-8 w-8 mb-2 opacity-40" />
          Нет открытых вопросов
        </CardContent>
      </Card>
    );
  }
  return (
    <Stagger className="space-y-3">
      {questions.map((q) => (
        <FadeIn key={q.id}>
        <CardHover>
        <Card className="transition-shadow rounded-2xl">
          <CardContent className="flex items-start gap-4 py-4">
            <Avatar name={q.studentName} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{q.studentName}</span>
              <StatusBadge status={q.status as BadgeStatus} />
              </div>
              <p className="mt-1 text-sm">{q.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {q.courseTitle} → {q.moduleTitle} → {q.lessonTitle}
              </p>
            </div>
            {q.status === "open" && (
              <Button size="sm" variant="secondary" onClick={() => setSelectedQuestion(q)} aria-label="Ответить на вопрос">Ответить</Button>
            )}
          </CardContent>
        </Card>
        </CardHover>
        </FadeIn>
      ))}
      {selectedQuestion && (
        <AnswerQuestionModal 
          question={selectedQuestion} 
          onClose={() => setSelectedQuestion(null)} 
        />
      )}
    </Stagger>
  );
}

// ── Очередь заданий на проверку ─────────────────────────────────────
export function SubmissionsQueue({ submissions }: { submissions: SubmissionForReview[] }) {
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionForReview | null>(null);

  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <FileText className="mx-auto h-8 w-8 mb-2 opacity-40" />
          Нет заданий на проверку
        </CardContent>
      </Card>
    );
  }
  return (
    <>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Слушатель</TableHead>
            <TableHead>Задание</TableHead>
            <TableHead>Курс</TableHead>
            <TableHead>Попытка</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="text-right">Действие</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar name={s.studentName} className="h-7 w-7 text-[10px]" />
                  <span className="text-sm font-medium">{s.studentName}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm">{s.assignmentTitle}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{s.courseTitle}</TableCell>
              <TableCell className="text-sm">#{s.attemptNumber}</TableCell>
              <TableCell>
                <SubmissionBadge status={s.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" onClick={() => setSelectedSubmission(s)} aria-label="Проверить задание">Проверить</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      {selectedSubmission && (
        <ReviewSubmissionModal 
          submission={selectedSubmission} 
          onClose={() => setSelectedSubmission(null)} 
        />
      )}
    </>
  );
}

function SubmissionBadge({ status }: { status: SubmissionForReview["status"] }) {
  return <StatusBadge status={status as BadgeStatus} />;
}

// ── Список рисков ───────────────────────────────────────────────────
export function RisksList({ risks }: { risks: RiskItem[] }) {
  if (risks.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <CheckCircle2 className="mx-auto h-8 w-8 mb-2 opacity-40" />
          Нет открытых рисков
        </CardContent>
      </Card>
    );
  }
  return (
    <Stagger className="space-y-3">
      {risks.map((r) => (
        <FadeIn key={r.id}>
        <CardHover>
        <Card className="transition-shadow rounded-2xl">
          <CardContent className="flex items-center gap-4 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{r.studentName}</span>
                <StatusBadge status={r.severity as BadgeStatus} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {RISK_LABELS[r.type]} · {r.courseTitle}
                {r.cohortName && ` · ${r.cohortName}`}
              </p>
            </div>
            <Button size="sm" variant="secondary" aria-label="Подробнее о риске">Подробнее</Button>
          </CardContent>
        </Card>
        </CardHover>
        </FadeIn>
      ))}
    </Stagger>
  );
}

// ── Таблица кураторов ───────────────────────────────────────────────
export function CuratorLoadTable({ curators }: { curators: CuratorLoad[] }) {
  return (
    <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Куратор</TableHead>
          <TableHead className="text-center">Слушатели</TableHead>
          <TableHead className="text-center">Вопросы</TableHead>
          <TableHead className="text-center">На проверку</TableHead>
          <TableHead className="text-center">Ср. ответ</TableHead>
          <TableHead className="text-center">Риски</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {curators.map((c) => (
          <TableRow key={c.curatorId}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar name={c.curatorName} className="h-7 w-7 text-[10px]" />
                <span className="text-sm font-medium">{c.curatorName}</span>
              </div>
            </TableCell>
            <TableCell className="text-center text-sm">{c.studentsCount}</TableCell>
            <TableCell className="text-center">
              <StatusBadge status={c.openQuestions > 3 ? "critical" : "ACTIVE"} label={String(c.openQuestions)} />
            </TableCell>
            <TableCell className="text-center">
              <StatusBadge status={c.pendingReviews > 5 ? "high" : "ACTIVE"} label={String(c.pendingReviews)} />
            </TableCell>
            <TableCell className="text-center text-sm">
              <span className={c.avgResponseHours > 4 ? "text-rose-600 font-medium" : "text-emerald-600"}>
                {c.avgResponseHours} ч
              </span>
            </TableCell>
            <TableCell className="text-center">
              <StatusBadge status={c.riskStudents > 3 ? "critical" : "ACTIVE"} label={String(c.riskStudents)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}
