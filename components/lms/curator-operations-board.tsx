"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileCheck2,
  MessageCircle,
  Send,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ChatPanel } from "@/components/lms/chat-panel";
import { StatusBadge } from "@/components/lms/status-badge";
import type { CuratorStudentOperation, ProgressStatus, RiskSeverity } from "@/types/domain";

const PROGRESS_LABELS: Record<ProgressStatus, string> = {
  NOT_STARTED: "Не начат",
  IN_PROGRESS: "В процессе",
  COMPLETED: "Завершен",
  BLOCKED: "Заблокирован",
};

const RISK_LABELS: Record<RiskSeverity, string> = {
  critical: "Критический",
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

const ACTION_TONE_CLASSES: Record<CuratorStudentOperation["nextAction"]["tone"], string> = {
  primary: "border-primary/20 bg-primary/5",
  warning: "border-amber-200 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30",
  danger: "border-rose-200 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/30",
  neutral: "border-border bg-card",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

function formatLastLogin(days: number | null) {
  if (days === null) return "вход не зафиксирован";
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  return `${days} дн. назад`;
}

function deadlineText(student: CuratorStudentOperation) {
  const deadline = student.nextDeadline;
  if (!deadline) return "дедлайнов нет";
  if (deadline.overdue) return `просрочен: ${deadline.title}`;
  if (deadline.daysLeft === 0) return `сегодня: ${deadline.title}`;
  if (deadline.daysLeft === 1) return `завтра: ${deadline.title}`;
  return `${deadline.daysLeft} дн.: ${deadline.title}`;
}

function ActionButton({ student, onChat }: { student: CuratorStudentOperation; onChat: () => void }) {
  if (student.nextAction.kind === "chat" || student.nextAction.kind === "check_in") {
    return (
      <Button size="sm" variant={student.nextAction.tone === "danger" ? "danger" : "primary"} onClick={onChat}>
        <Send className="h-4 w-4" aria-hidden />
        {student.nextAction.label}
      </Button>
    );
  }

  return (
    <Button
      asChild
      size="sm"
      variant={student.nextAction.tone === "danger" ? "danger" : student.nextAction.tone === "primary" ? "primary" : "secondary"}
    >
      <Link href={student.nextAction.href}>
        {student.nextAction.label}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </Button>
  );
}

function CounterPill({
  icon,
  label,
  value,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  active: boolean;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${active ? "border-primary/20 bg-primary/5 text-foreground" : "border-border text-muted-foreground"}`}>
      {icon}
      <span className="tabular-nums">{value}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

export function CuratorOperationsBoard({ students }: { students: CuratorStudentOperation[] }) {
  const [chatStudent, setChatStudent] = useState<CuratorStudentOperation | null>(null);
  const summary = useMemo(() => ({
    urgent: students.filter((student) => student.nextAction.tone === "danger").length,
    questions: students.reduce((sum, student) => sum + student.openQuestions, 0),
    assignments: students.reduce((sum, student) => sum + student.pendingAssignments, 0),
    unread: students.reduce((sum, student) => sum + student.unreadMessages, 0),
  }), [students]);

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 opacity-40" />
          У вас пока нет закрепленных слушателей.
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Операционная карта слушателей</h2>
          <p className="text-sm text-muted-foreground">
            Карточки отсортированы по срочности: риски, вопросы, задания, чат и дедлайны.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge className="border-rose-200 bg-rose-50 text-rose-700">{summary.urgent} срочно</Badge>
          <Badge className="border-sky-200 bg-sky-50 text-sky-700">{summary.questions} вопросов</Badge>
          <Badge className="border-violet-200 bg-violet-50 text-violet-700">{summary.assignments} работ</Badge>
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">{summary.unread} в чате</Badge>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {students.map((student) => (
          <article
            key={student.assignmentId}
            className={`rounded-2xl border p-4 shadow-panel ${ACTION_TONE_CLASSES[student.nextAction.tone]}`}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex items-start gap-3">
                <Avatar name={student.name} className="h-11 w-11" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold">{student.name}</h3>
                    <StatusBadge status={student.progressStatus} label={PROGRESS_LABELS[student.progressStatus]} />
                    {student.highestRiskSeverity && (
                      <StatusBadge
                        status={student.highestRiskSeverity}
                        label={RISK_LABELS[student.highestRiskSeverity]}
                      />
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                  <p className="mt-1 truncate text-sm">
                    {student.courseTitle} · {student.cohortName}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="secondary" onClick={() => setChatStudent(student)}>
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Чат
                </Button>
                <ActionButton student={student} onChat={() => setChatStudent(student)} />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Прогресс курса</span>
                <span className="font-medium tabular-nums">{student.progressPercent}%</span>
              </div>
              <Progress value={student.progressPercent} />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="min-w-0 rounded-xl border bg-background/70 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <BookOpen className="h-4 w-4" aria-hidden />
                  Последний контекст
                </div>
                {student.lastContext ? (
                  <p className="mt-1 truncate text-sm">
                    {student.lastContext.moduleTitle}
                    {student.lastContext.blockTitle ? ` · ${student.lastContext.blockTitle}` : ""} · {student.lastContext.lessonTitle}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">урок еще не начат</p>
                )}
              </div>
              <div className="min-w-0 rounded-xl border bg-background/70 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  Ближайший дедлайн
                </div>
                <p className={`mt-1 truncate text-sm ${student.nextDeadline?.overdue ? "font-medium text-rose-700 dark:text-rose-300" : ""}`}>
                  {deadlineText(student)}
                  {student.nextDeadline ? ` · ${formatDate(student.nextDeadline.dueAt)}` : ""}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <CounterPill
                icon={<MessageCircle className="h-3.5 w-3.5" aria-hidden />}
                label="вопросов"
                value={student.openQuestions}
                active={student.openQuestions > 0}
              />
              <CounterPill
                icon={<FileCheck2 className="h-3.5 w-3.5" aria-hidden />}
                label="работ"
                value={student.pendingAssignments}
                active={student.pendingAssignments > 0}
              />
              <CounterPill
                icon={<AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
                label="рисков"
                value={student.activeRisks}
                active={student.activeRisks > 0}
              />
              <CounterPill
                icon={<Send className="h-3.5 w-3.5" aria-hidden />}
                label="чат"
                value={student.unreadMessages}
                active={student.unreadMessages > 0}
              />
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                Последний вход: {formatLastLogin(student.daysSinceLogin)}
              </span>
              <span className="font-medium text-foreground">{student.nextAction.reason}</span>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={Boolean(chatStudent)} onOpenChange={(open) => !open && setChatStudent(null)}>
        {chatStudent && (
          <DialogContent className="max-w-3xl p-0">
            <DialogHeader>
              <DialogTitle>Чат: {chatStudent.name}</DialogTitle>
              <DialogDescription>
                Быстрый диалог с закрепленным слушателем. Сообщение сохранит контекст последнего урока, если он есть.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4">
              <ChatPanel
                studentId={chatStudent.studentId}
                replyLessonId={chatStudent.lastContext?.lessonId}
                conversationTitle="Чат со слушателем"
                emptyState="Напишите слушателю первое сообщение."
                historyTitle={`Чат со слушателем: ${chatStudent.name}`}
                otherParticipantName="Слушатель"
              />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
