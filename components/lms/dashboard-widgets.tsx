"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, FileText, MessageCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { AnswerQuestionModal, ReviewSubmissionModal } from "./curator-modals";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-rose-600",
  info: "text-sky-600",
};

export function MetricGrid({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m, i) => (
        <Card key={m.label} className="animate-slide-up rounded-2xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5" style={{ animationDelay: `${i * 50}ms` }}>
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
      ))}
    </div>
  );
}

// ── Продолжить обучение ─────────────────────────────────────────────
export function ContinueLearningCard({ data }: { data: ContinueLearning }) {
  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent transition-shadow hover:shadow-panel">
      <CardHeader>
        <Badge className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700">
          Следующее действие
        </Badge>
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
  );
}

// ── Сетка курсов с прогрессом ───────────────────────────────────────
export function CourseProgressGrid({ courses }: { courses: StudentProgress[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <Card key={c.courseId} className="rounded-2xl transition-shadow hover:shadow-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge
                className={
                  c.status === "COMPLETED"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : c.status === "IN_PROGRESS"
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-gray-200 bg-gray-50 text-gray-600"
                }
              >
                {c.status === "COMPLETED" ? "Завершён" : c.status === "IN_PROGRESS" ? "В процессе" : "Не начат"}
              </Badge>
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
      ))}
    </div>
  );
}

// ── Сетка курсов (для инструктора/админа) ───────────────────────────
export function CourseManageGrid({ courses }: { courses: CourseSummary[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <Card key={c.id} className="rounded-2xl transition-shadow hover:shadow-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge
                className={
                  c.status === "PUBLISHED"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : c.status === "DRAFT"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-gray-50 text-gray-600"
                }
              >
                {c.status === "PUBLISHED" ? "Опубликован" : c.status === "DRAFT" ? "Черновик" : "Архив"}
              </Badge>
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
                <Link href={`/instructor/courses/${c.id}/builder`}>Управление курсом</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
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
    <div className="space-y-3">
      {questions.map((q) => (
        <Card key={q.id} className="transition-shadow hover:shadow-sm">
          <CardContent className="flex items-start gap-4 py-4">
            <Avatar name={q.studentName} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{q.studentName}</span>
                <Badge
                  className={
                    q.status === "open"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : q.status === "answered"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-sky-200 bg-sky-50 text-sky-700"
                  }
                >
                  {q.status === "open" ? "Ожидает ответа" : q.status === "answered" ? "Отвечен" : "Передан"}
                </Badge>
              </div>
              <p className="mt-1 text-sm">{q.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {q.courseTitle} → {q.moduleTitle} → {q.lessonTitle}
              </p>
            </div>
            {q.status === "open" && (
              <Button size="sm" variant="secondary" onClick={() => setSelectedQuestion(q)}>Ответить</Button>
            )}
          </CardContent>
        </Card>
      ))}
      {selectedQuestion && (
        <AnswerQuestionModal 
          question={selectedQuestion} 
          onClose={() => setSelectedQuestion(null)} 
        />
      )}
    </div>
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
                <Button size="sm" onClick={() => setSelectedSubmission(s)}>Проверить</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
  const MAP: Record<string, { label: string; cls: string }> = {
    SUBMITTED: { label: "Отправлено", cls: "border-sky-200 bg-sky-50 text-sky-700" },
    IN_REVIEW: { label: "На проверке", cls: "border-amber-200 bg-amber-50 text-amber-700" },
    ACCEPTED: { label: "Зачтено", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    REJECTED: { label: "Отклонено", cls: "border-rose-200 bg-rose-50 text-rose-700" },
    NEEDS_REVISION: { label: "На доработку", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  };
  const m = MAP[status] ?? { label: status, cls: "" };
  return <Badge className={m.cls}>{m.label}</Badge>;
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
  const SEVERITY_CLS: Record<string, string> = {
    critical: "border-rose-300 bg-rose-50 text-rose-700",
    high: "border-amber-300 bg-amber-50 text-amber-700",
    medium: "border-yellow-200 bg-yellow-50 text-yellow-700",
    low: "border-gray-200 bg-gray-50 text-gray-600",
  };
  return (
    <div className="space-y-3">
      {risks.map((r) => (
        <Card key={r.id} className="transition-shadow hover:shadow-sm">
          <CardContent className="flex items-center gap-4 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{r.studentName}</span>
                <Badge className={SEVERITY_CLS[r.severity] ?? ""}>
                  {r.severity === "critical" ? "Критический" : r.severity === "high" ? "Высокий" : r.severity === "medium" ? "Средний" : "Низкий"}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {RISK_LABELS[r.type]} · {r.courseTitle}
                {r.cohortName && ` · ${r.cohortName}`}
              </p>
            </div>
            <Button size="sm" variant="secondary">Подробнее</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Таблица кураторов ───────────────────────────────────────────────
export function CuratorLoadTable({ curators }: { curators: CuratorLoad[] }) {
  return (
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
              <Badge className={c.openQuestions > 3 ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                {c.openQuestions}
              </Badge>
            </TableCell>
            <TableCell className="text-center">
              <Badge className={c.pendingReviews > 5 ? "border-amber-200 bg-amber-50 text-amber-700" : ""}>
                {c.pendingReviews}
              </Badge>
            </TableCell>
            <TableCell className="text-center text-sm">
              <span className={c.avgResponseHours > 4 ? "text-rose-600 font-medium" : "text-emerald-600"}>
                {c.avgResponseHours} ч
              </span>
            </TableCell>
            <TableCell className="text-center">
              <Badge className={c.riskStudents > 3 ? "border-rose-200 bg-rose-50 text-rose-700" : ""}>
                {c.riskStudents}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
