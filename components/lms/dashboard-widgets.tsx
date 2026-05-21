"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/lms/status-badge";
import type { BadgeStatus } from "@/components/lms/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Stagger, CardHover, FadeIn } from "@/components/lms/animations";
import { EmptyState } from "@/components/lms/empty-state";
import { Icon } from "@/components/ui/icon";
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
import { cn } from "@/lib/utils";

// ── M3 tone classes ──────────────────────────────────────────────────
const TONE_CLASSES: Record<DashboardMetric["tone"], string> = {
  primary: "text-m3-primary",
  success: "text-m3-tertiary dark:text-m3-tertiary",
  warning: "text-m3-secondary dark:text-m3-secondary",
  danger: "text-m3-error",
  info: "text-m3-on-surface-variant",
  neutral: "text-m3-on-surface",
};

const TONE_BG_CLASSES: Record<DashboardMetric["tone"], string> = {
  primary: "bg-m3-primary/10",
  success: "bg-m3-tertiary-fixed/60 dark:bg-m3-tertiary-container/30",
  warning: "bg-m3-secondary-fixed/60 dark:bg-m3-secondary-container/30",
  danger: "bg-m3-error-container/30",
  info: "bg-m3-surface-container-high",
  neutral: "bg-m3-surface-container-high",
};

/** Акцентная полоса сверху (для горизонтальных карточек на ПК удобнее, чем border-l) */
const TONE_TOP_ACCENT: Record<DashboardMetric["tone"], string> = {
  primary: "from-m3-primary/40",
  success: "from-m3-tertiary/40",
  warning: "from-m3-secondary/40",
  danger: "from-m3-error/40",
  info: "from-m3-outline/30",
  neutral: "from-m3-outline/20",
};

const TONE_ICON_NAMES: Record<DashboardMetric["tone"], string> = {
  primary: "trending_up",
  success: "check_circle",
  warning: "warning",
  danger: "error",
  info: "info",
  neutral: "analytics",
};

// ── Метрики ─────────────────────────────────────────────────────────
export function MetricGrid({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <Stagger className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
      {metrics.map((m) => (
        <FadeIn key={m.label} className="h-full">
          <MetricCard metric={m} />
        </FadeIn>
      ))}
    </Stagger>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const card = (
    <Card
      className={cn(
        "relative flex min-h-[178px] h-full flex-col overflow-hidden rounded-xl bg-m3-surface-container-lowest shadow-m3-soft transition-all hover:shadow-m3-soft-hover",
        "px-5 py-4",
        "before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:to-transparent",
        TONE_TOP_ACCENT[metric.tone],
        metric.priority === "critical" && "ring-1 ring-m3-error/25",
        metric.priority === "elevated" && "ring-1 ring-amber-400/25",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 max-w-[calc(100%-3rem)]">
          <p className="text-body-md font-semibold leading-5 text-m3-on-surface">{metric.label}</p>
          {metric.description ? (
            <p className="mt-1 line-clamp-2 text-body-sm font-body-sm leading-5 text-m3-on-surface-variant">
              {metric.description}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            "shadow-m3-soft",
            TONE_BG_CLASSES[metric.tone],
          )}
        >
          <Icon name={TONE_ICON_NAMES[metric.tone]} size={20} className={TONE_CLASSES[metric.tone]} />
        </span>
      </div>

      <div className="mt-5 flex flex-1 flex-col justify-end">
        <p className={`text-display-lg font-bold leading-none tabular-nums ${TONE_CLASSES[metric.tone]}`}>
          {metric.value}
        </p>
        {metric.detail || metric.change ? (
          <p className="mt-3 text-body-sm font-body-sm leading-5 text-m3-on-surface-variant">
            {metric.detail ?? metric.change}
          </p>
        ) : null}
      </div>
    </Card>
  );

  if (!metric.href) {
    return <CardHover className="h-full">{card}</CardHover>;
  }

  return (
    <CardHover className="h-full">
      <Link href={metric.href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2">
        {card}
      </Link>
    </CardHover>
  );
}

// ── Продолжить обучение ─────────────────────────────────────────────
export function ContinueLearningCard({ data }: { data: ContinueLearning }) {
  return (
    <FadeIn>
    <Card className="overflow-hidden border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-shadow hover:shadow-m3-soft-hover rounded-xl">
      <CardHeader>
        <StatusBadge status="ACTIVE" label="Следующее действие" className="w-fit" />
        <CardTitle className="text-headline-md text-m3-on-surface">Продолжить: {data.courseTitle}</CardTitle>
        <CardDescription className="font-body-md text-body-md text-m3-on-surface-variant">
          {data.moduleTitle} · {data.lessonTitle}
          {data.deadlineDaysLeft != null && ` · дедлайн через ${data.deadlineDaysLeft} дн.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between font-body-sm text-body-sm">
            <span className="text-m3-on-surface-variant">Прогресс курса</span>
            <span className="font-medium text-m3-primary">{data.coursePercent}%</span>
          </div>
          <Progress value={data.coursePercent} className="bg-m3-surface-container-high [&>div]:bg-m3-primary" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between font-body-sm text-body-sm">
            <span className="text-m3-on-surface-variant">Прогресс модуля</span>
            <span className="font-medium text-m3-primary">{data.modulePercent}%</span>
          </div>
          <Progress value={data.modulePercent} className="h-1.5 bg-m3-surface-container-high [&>div]:bg-m3-primary" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body-sm text-body-sm text-m3-on-surface-variant">
            До сертификата: пройти {100 - data.coursePercent}% курса и сдать финальное задание.
          </p>
          <Button asChild>
            <Link href={`/student/lessons/${data.lessonId}`}>
            Открыть урок
            <Icon name="arrow_forward" className="text-[18px]" />
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
        <Card className="rounded-xl border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <StatusBadge status={c.status as BadgeStatus} />
              <Icon name="menu_book" className="text-m3-on-surface-variant text-[20px]" />
            </div>
            <CardTitle className="text-headline-sm text-m3-on-surface">{c.courseTitle}</CardTitle>
            <CardDescription className="font-body-md text-body-md text-m3-on-surface-variant">
              {c.currentModuleTitle && `${c.currentModuleTitle}`}
              {c.currentLessonTitle && ` → ${c.currentLessonTitle}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={c.percent} className="bg-m3-surface-container-high [&>div]:bg-m3-primary" />
            <Button asChild className="mt-3 w-full" size="sm" variant="secondary">
              <Link href={c.nextLessonId ? `/student/lessons/${c.nextLessonId}` : `/student/courses/${c.courseId}`}>
                {c.nextLessonId ? "Продолжить" : "Открыть курс"}
              </Link>
            </Button>
            <p className="font-body-sm text-body-sm text-m3-on-surface-variant">{c.percent}% завершено</p>
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
            <Card className="rounded-xl border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <StatusBadge status={c.status as BadgeStatus} />
                  <Icon name="school" className="text-m3-on-surface-variant text-[20px]" />
                </div>
                <CardTitle className="text-headline-sm text-m3-on-surface">{c.title}</CardTitle>
                <CardDescription className="font-body-md text-body-md text-m3-on-surface-variant">{c.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 font-body-sm text-body-sm text-m3-on-surface-variant">
                  <span>{c.modulesCount} модулей</span>
                  <span>{c.lessonsCount} уроков</span>
                  <span>{c.durationHours} ч.</span>
                </div>
                {c.instructors.length > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <Avatar name={c.instructors[0].name} className="h-6 w-6 text-[10px]" />
                    <span className="font-body-sm text-body-sm text-m3-on-surface-variant">{c.instructors[0].name}</span>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-m3-outline-variant">
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
      <EmptyState icon="forum" title="Нет открытых вопросов" description="Когда слушатели зададут вопросы в уроках, они появятся здесь." />
    );
  }
  return (
    <Stagger className="space-y-3">
      {questions.map((q) => (
        <FadeIn key={q.id}>
        <CardHover>
        <Card className="transition-shadow rounded-xl border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardContent className="flex items-start gap-4 py-4">
            <Avatar name={q.studentName} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-label-lg text-label-lg text-m3-on-surface">{q.studentName}</span>
              <StatusBadge status={q.status as BadgeStatus} />
              </div>
              <p className="mt-1 font-body-md text-body-md text-m3-on-surface">{q.text}</p>
              <p className="mt-1 font-body-sm text-body-sm text-m3-on-surface-variant">
                {q.courseTitle} → {q.moduleTitle} → {q.lessonTitle}
              </p>
            </div>
            {q.status === "open" && (
              <Button size="sm" variant="secondary" onClick={() => setSelectedQuestion(q)} aria-label="Ответить на вопрос">
                <Icon name="reply" className="text-[18px]" />
                Ответить
              </Button>
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
      <EmptyState icon="assignment" title="Нет заданий на проверку" description="Все отправленные задания проверены. Новые появятся здесь автоматически." />
    );
  }
  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
      <Table>
        <TableHeader className="bg-m3-surface-container">
          <TableRow>
            <TableHead className="font-label-lg text-label-lg text-m3-on-surface-variant">Слушатель</TableHead>
            <TableHead className="font-label-lg text-label-lg text-m3-on-surface-variant">Задание</TableHead>
            <TableHead className="font-label-lg text-label-lg text-m3-on-surface-variant">Курс</TableHead>
            <TableHead className="font-label-lg text-label-lg text-m3-on-surface-variant">Попытка</TableHead>
            <TableHead className="font-label-lg text-label-lg text-m3-on-surface-variant">Статус</TableHead>
            <TableHead className="font-label-lg text-label-lg text-m3-on-surface-variant text-right">Действие</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((s) => (
            <TableRow key={s.id} className="hover:bg-m3-surface-container-low transition-colors">
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar name={s.studentName} className="h-7 w-7 text-[10px]" />
                  <span className="font-label-lg text-label-lg text-m3-on-surface">{s.studentName}</span>
                </div>
              </TableCell>
              <TableCell className="font-body-md text-body-md text-m3-on-surface">{s.assignmentTitle}</TableCell>
              <TableCell className="font-body-sm text-body-sm text-m3-on-surface-variant">{s.courseTitle}</TableCell>
              <TableCell className="font-body-md text-body-md text-m3-on-surface">#{s.attemptNumber}</TableCell>
              <TableCell>
                <SubmissionBadge status={s.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" onClick={() => setSelectedSubmission(s)} aria-label="Проверить задание">
                  <Icon name="rate_review" className="text-[18px]" />
                  Проверить
                </Button>
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
      <EmptyState icon="check_circle" title="Нет открытых рисков" description="У ваших слушателей нет активных рисков. Отличная работа!" />
    );
  }
  return (
    <Stagger className="space-y-3">
      {risks.map((r) => (
        <FadeIn key={r.id}>
        <CardHover>
        <Card className="transition-shadow rounded-xl border-m3-error/30 bg-m3-surface-container-lowest shadow-m3-soft">
          <CardContent className="flex items-center gap-4 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-error-container/30">
              <Icon name="warning" className="text-[20px] text-m3-error" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-label-lg text-label-lg text-m3-on-surface">{r.studentName}</span>
                <StatusBadge status={r.severity as BadgeStatus} />
              </div>
              <p className="mt-0.5 font-body-sm text-body-sm text-m3-on-surface-variant">
                {RISK_LABELS[r.type]} · {r.courseTitle}
                {r.cohortName && ` · ${r.cohortName}`}
              </p>
            </div>
            <Button size="sm" variant="secondary" aria-label="Подробнее о риске">
              <Icon name="arrow_forward" className="text-[18px]" />
              Подробнее
            </Button>
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
    <div className="overflow-x-auto rounded-xl border border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
    <Table>
      <TableHeader className="bg-m3-surface-container">
        <TableRow>
          <TableHead className="font-label-lg text-label-lg text-m3-on-surface-variant">Куратор</TableHead>
          <TableHead className="font-label-lg text-label-lg text-m3-on-surface-variant text-center">Слушатели</TableHead>
          <TableHead className="font-label-lg text-label-lg text-m3-on-surface-variant text-center">Вопросы</TableHead>
          <TableHead className="font-label-lg text-label-lg text-m3-on-surface-variant text-center">На проверку</TableHead>
          <TableHead className="font-label-lg text-label-lg text-m3-on-surface-variant text-center">Ср. ответ</TableHead>
          <TableHead className="font-label-lg text-label-lg text-m3-on-surface-variant text-center">Риски</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {curators.map((c) => (
          <TableRow key={c.curatorId} className="hover:bg-m3-surface-container-low transition-colors">
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar name={c.curatorName} className="h-7 w-7 text-[10px]" />
                <span className="font-label-lg text-label-lg text-m3-on-surface">{c.curatorName}</span>
              </div>
            </TableCell>
            <TableCell className="text-center font-body-md text-body-md text-m3-on-surface">{c.studentsCount}</TableCell>
            <TableCell className="text-center">
              <StatusBadge status={c.openQuestions > 3 ? "critical" : "ACTIVE"} label={String(c.openQuestions)} />
            </TableCell>
            <TableCell className="text-center">
              <StatusBadge status={c.pendingReviews > 5 ? "high" : "ACTIVE"} label={String(c.pendingReviews)} />
            </TableCell>
            <TableCell className="text-center font-body-md text-body-md">
              <span className={c.avgResponseHours > 4 ? "text-m3-error font-medium" : "text-emerald-600"}>
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
