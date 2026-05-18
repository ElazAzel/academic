"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ChatPanel } from "@/components/lms/chat-panel";
import { StatusBadge } from "@/components/lms/status-badge";
import { Icon } from "@/components/ui/icon";
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
  primary: "border-m3-primary/20 bg-m3-primary-fixed/10",
  warning: "border-amber-200 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30",
  danger: "border-m3-error/20 bg-m3-error-container/20",
  neutral: "border-m3-outline-variant bg-m3-surface-container-lowest",
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
        <Icon name="send" className="text-[18px]" />
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
        <Icon name="arrow_forward" className="text-[18px]" />
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
    <div className={`flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${active ? "border-m3-primary/20 bg-m3-primary-fixed/10 text-foreground" : "border-m3-outline-variant text-m3-on-surface-variant"}`}>
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
      <Card className="border-m3-outline-variant bg-m3-surface-container-lowest rounded-xl shadow-m3-soft">
        <CardContent className="py-10 text-center text-m3-on-surface-variant">
          <Icon name="check_circle" className="mx-auto mb-2 h-8 w-8 opacity-40" />
          <p className="font-body-md text-body-md">У вас пока нет закрепленных слушателей.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-m3-headline-sm text-m3-on-surface">Операционная карта слушателей</h2>
          <p className="font-body-md text-body-md text-m3-on-surface-variant">
            Карточки отсортированы по срочности: риски, вопросы, задания, чат и дедлайны.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-m3-error-container/30 text-m3-error font-label-md text-label-md">
            <Icon name="warning" className="text-[16px]" />
            {summary.urgent} срочно
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-m3-primary-fixed/30 text-m3-primary font-label-md text-label-md">
            <Icon name="forum" className="text-[16px]" />
            {summary.questions} вопросов
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-m3-secondary-fixed/30 text-m3-secondary font-label-md text-label-md">
            <Icon name="assignment" className="text-[16px]" />
            {summary.assignments} работ
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-label-md text-label-md">
            <Icon name="chat" className="text-[16px]" />
            {summary.unread} в чате
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {students.map((student) => (
          <article
            key={student.assignmentId}
            className={`rounded-xl border p-4 shadow-m3-soft ${ACTION_TONE_CLASSES[student.nextAction.tone]}`}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex items-start gap-3">
                <Avatar name={student.name} className="h-11 w-11" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-m3-label-lg text-label-lg text-m3-on-surface">{student.name}</h3>
                    <StatusBadge status={student.progressStatus} label={PROGRESS_LABELS[student.progressStatus]} />
                    {student.highestRiskSeverity && (
                      <StatusBadge
                        status={student.highestRiskSeverity}
                        label={RISK_LABELS[student.highestRiskSeverity]}
                      />
                    )}
                  </div>
                  <p className="truncate font-body-sm text-body-sm text-m3-on-surface-variant">{student.email}</p>
                  <p className="mt-1 truncate font-body-md text-body-md text-m3-on-surface-variant">
                    {student.courseTitle} · {student.cohortName}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="secondary" onClick={() => setChatStudent(student)}>
                  <Icon name="chat" className="text-[18px]" />
                  Чат
                </Button>
                <ActionButton student={student} onChat={() => setChatStudent(student)} />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between font-body-sm text-body-sm">
                <span className="text-m3-on-surface-variant">Прогресс курса</span>
                <span className="font-medium text-m3-primary tabular-nums">{student.progressPercent}%</span>
              </div>
              <Progress value={student.progressPercent} className="bg-m3-surface-container-high [&>div]:bg-m3-primary" />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-m3-outline-variant bg-m3-surface-container-low p-3">
                <div className="flex items-center gap-2 font-label-md text-label-md text-m3-on-surface-variant">
                  <Icon name="menu_book" className="text-[16px]" />
                  Последний контекст
                </div>
                {student.lastContext ? (
                  <p className="mt-1 truncate font-body-md text-body-md text-m3-on-surface">
                    {student.lastContext.moduleTitle}
                    {student.lastContext.blockTitle ? ` · ${student.lastContext.blockTitle}` : ""} · {student.lastContext.lessonTitle}
                  </p>
                ) : (
                  <p className="mt-1 font-body-md text-body-md text-m3-on-surface-variant">урок еще не начат</p>
                )}
              </div>
              <div className="min-w-0 rounded-xl border border-m3-outline-variant bg-m3-surface-container-low p-3">
                <div className="flex items-center gap-2 font-label-md text-label-md text-m3-on-surface-variant">
                  <Icon name="calendar_today" className="text-[16px]" />
                  Ближайший дедлайн
                </div>
                <p className={`mt-1 truncate font-body-md text-body-md ${student.nextDeadline?.overdue ? "font-medium text-m3-error" : "text-m3-on-surface"}`}>
                  {deadlineText(student)}
                  {student.nextDeadline ? ` · ${formatDate(student.nextDeadline.dueAt)}` : ""}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <CounterPill
                icon={<Icon name="forum" className="text-[14px]" />}
                label="вопросов"
                value={student.openQuestions}
                active={student.openQuestions > 0}
              />
              <CounterPill
                icon={<Icon name="assignment" className="text-[14px]" />}
                label="работ"
                value={student.pendingAssignments}
                active={student.pendingAssignments > 0}
              />
              <CounterPill
                icon={<Icon name="warning" className="text-[14px]" />}
                label="рисков"
                value={student.activeRisks}
                active={student.activeRisks > 0}
              />
              <CounterPill
                icon={<Icon name="send" className="text-[14px]" />}
                label="чат"
                value={student.unreadMessages}
                active={student.unreadMessages > 0}
              />
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-m3-outline-variant pt-3 font-body-sm text-body-sm text-m3-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="schedule" className="text-[14px]" />
                Последний вход: {formatLastLogin(student.daysSinceLogin)}
              </span>
              <span className="font-medium text-m3-on-surface">{student.nextAction.reason}</span>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={Boolean(chatStudent)} onOpenChange={(open) => !open && setChatStudent(null)}>
        {chatStudent && (
          <DialogContent className="max-w-3xl p-0">
            <DialogHeader>
              <DialogTitle className="text-m3-headline-sm text-m3-on-surface">Чат: {chatStudent.name}</DialogTitle>
              <DialogDescription className="font-body-md text-body-md text-m3-on-surface-variant">
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
