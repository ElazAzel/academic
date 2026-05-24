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
import { cn } from "@/lib/utils";

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
  primary: "border-m3-primary/25 bg-m3-surface-container-lowest dark:bg-slate-900",
  warning: "border-amber-500/25 bg-amber-50/40 dark:bg-amber-950/10",
  danger: "border-m3-error/25 bg-m3-error-container/10 dark:bg-m3-error-container/5",
  neutral: "border-m3-outline-variant bg-m3-surface-container-lowest dark:bg-slate-900",
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
    <div className={cn(
      "flex min-w-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all duration-300",
      active
        ? "border-m3-primary/20 bg-m3-primary-fixed/15 text-m3-primary font-semibold"
        : "border-m3-outline-variant/60 bg-m3-surface-container-low/40 text-m3-on-surface-variant"
    )}>
      {icon}
      <span className="tabular-nums">{value}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

export function CuratorOperationsBoard({ students }: { students: CuratorStudentOperation[] }) {
  const [chatStudent, setChatStudent] = useState<CuratorStudentOperation | null>(null);
  const [chatInitialText, setChatInitialText] = useState("");
  const [diagStudent, setDiagStudent] = useState<CuratorStudentOperation | null>(null);

  // States for live searching and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "high_crit" | "med_low" | "none">("all");
  const [actionFilter, setActionFilter] = useState<"all" | "reply" | "assignments" | "urgent">("all");

  const summary = useMemo(() => ({
    urgent: students.filter((student) => student.nextAction.tone === "danger").length,
    questions: students.reduce((sum, student) => sum + student.openQuestions, 0),
    assignments: students.reduce((sum, student) => sum + student.pendingAssignments, 0),
    unread: students.reduce((sum, student) => sum + student.unreadMessages, 0),
  }), [students]);

  // Client-side filtering logic
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // 1. Text search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = student.name?.toLowerCase().includes(query);
        const matchEmail = student.email?.toLowerCase().includes(query);
        const matchCourse = student.courseTitle?.toLowerCase().includes(query);
        const matchCohort = student.cohortName?.toLowerCase().includes(query);
        if (!matchName && !matchEmail && !matchCourse && !matchCohort) {
          return false;
        }
      }
      // 2. Risk filter
      if (riskFilter !== "all") {
        const risk = student.highestRiskSeverity;
        if (riskFilter === "high_crit" && risk !== "high" && risk !== "critical") return false;
        if (riskFilter === "med_low" && risk !== "medium" && risk !== "low") return false;
        if (riskFilter === "none" && risk !== undefined && risk !== null) return false;
      }
      // 3. Action filter
      if (actionFilter !== "all") {
        if (actionFilter === "reply" && student.openQuestions === 0) return false;
        if (actionFilter === "assignments" && student.pendingAssignments === 0) return false;
        if (actionFilter === "urgent" && student.nextAction.tone !== "danger") return false;
      }
      return true;
    });
  }, [students, searchQuery, riskFilter, actionFilter]);

  const handleOpenChat = (student: CuratorStudentOperation) => {
    setChatInitialText("");
    setChatStudent(student);
  };

  const handleSendTemplateText = (student: CuratorStudentOperation, templateText: string) => {
    setChatInitialText(templateText);
    setChatStudent(student);
    setDiagStudent(null);
  };

  if (students.length === 0) {
    return (
      <Card className="border-m3-outline-variant bg-m3-surface-container-lowest rounded-lg shadow-m3-soft">
        <CardContent className="py-10 text-center text-m3-on-surface-variant">
          <Icon name="check_circle" className="mx-auto mb-2 h-8 w-8 opacity-40" />
          <p className="font-body-md text-body-md">У вас пока нет закрепленных слушателей.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      {/* Top Header Summary Dashboard */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-headline-sm text-m3-on-surface">Операционная карта слушателей</h2>
          <p className="font-body-md text-body-md text-m3-on-surface-variant">
            Карточки отсортированы по срочности: риски, вопросы, задания, чат и дедлайны.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-m3-error/25 bg-m3-error-container/15 px-3 py-1.5 text-xs font-semibold text-m3-error dark:bg-m3-error-container/10">
            <Icon name="warning" className="text-[15px]" />
            {summary.urgent} срочно
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-m3-primary/25 bg-m3-primary-fixed/15 px-3 py-1.5 text-xs font-semibold text-m3-primary">
            <Icon name="forum" className="text-[15px]" />
            {summary.questions} вопросов
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-m3-secondary/25 bg-m3-secondary-fixed/15 px-3 py-1.5 text-xs font-semibold text-m3-secondary">
            <Icon name="assignment" className="text-[15px]" />
            {summary.assignments} работ
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/5 dark:text-emerald-300">
            <Icon name="chat" className="text-[15px]" />
            {summary.unread} в чате
          </span>
        </div>
      </div>

      {/* Advanced Interactive Toolbar (Search & Segmented Filters) */}
      <Card className="space-y-4 border-m3-outline-variant p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Icon name="search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-m3-on-surface-variant/60" />
            <input
              type="text"
              placeholder="Живой поиск слушателей (имя, email, курс, когорта)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest/80 py-2.5 pl-10 pr-4 font-body-md text-body-md text-m3-on-surface placeholder:text-m3-on-surface-variant/50 focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/10 focus:outline-none transition-all duration-300"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-m3-on-surface-variant/60 hover:text-m3-on-surface transition-colors"
              >
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Risk Level Segmented Pill */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-m3-on-surface-variant/80">Фильтр рисков:</span>
            <div className="flex rounded-lg border border-m3-outline-variant bg-m3-surface-container-high/60 p-0.5">
              <button
                onClick={() => setRiskFilter("all")}
                className={cn("rounded-full px-3 py-1 font-medium transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)", riskFilter === "all" ? "bg-m3-primary text-m3-on-primary shadow-sm scale-105" : "text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-container-highest/40")}
              >
                Все
              </button>
              <button
                onClick={() => setRiskFilter("high_crit")}
                className={cn("rounded-full px-3 py-1 font-medium transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)", riskFilter === "high_crit" ? "bg-m3-error text-m3-on-error shadow-sm scale-105" : "text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-container-highest/40")}
              >
                Высокий/Крит. 🚨
              </button>
              <button
                onClick={() => setRiskFilter("med_low")}
                className={cn("rounded-full px-3 py-1 font-medium transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)", riskFilter === "med_low" ? "bg-m3-secondary text-m3-on-secondary shadow-sm scale-105" : "text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-container-highest/40")}
              >
                Низкий/Средний
              </button>
              <button
                onClick={() => setRiskFilter("none")}
                className={cn("rounded-full px-3 py-1 font-medium transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)", riskFilter === "none" ? "bg-emerald-600 text-white shadow-sm scale-105" : "text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-container-highest/40")}
              >
                Без рисков
              </button>
            </div>
          </div>

          {/* Action Queue Segmented Pill */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-m3-on-surface-variant/80">Очередь действий:</span>
            <div className="flex rounded-lg border border-m3-outline-variant bg-m3-surface-container-high/60 p-0.5">
              <button
                onClick={() => setActionFilter("all")}
                className={cn("rounded-full px-3 py-1 font-medium transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)", actionFilter === "all" ? "bg-m3-primary text-m3-on-primary shadow-sm scale-105" : "text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-container-highest/40")}
              >
                Все
              </button>
              <button
                onClick={() => setActionFilter("reply")}
                className={cn("rounded-full px-3 py-1 font-medium transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)", actionFilter === "reply" ? "bg-m3-primary-fixed text-m3-primary shadow-sm scale-105" : "text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-container-highest/40")}
              >
                Есть вопросы ({students.filter(s => s.openQuestions > 0).length})
              </button>
              <button
                onClick={() => setActionFilter("assignments")}
                className={cn("rounded-full px-3 py-1 font-medium transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)", actionFilter === "assignments" ? "bg-m3-secondary-fixed text-m3-secondary shadow-sm scale-105" : "text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-container-highest/40")}
              >
                Работы на проверку ({students.filter(s => s.pendingAssignments > 0).length})
              </button>
              <button
                onClick={() => setActionFilter("urgent")}
                className={cn("rounded-full px-3 py-1 font-medium transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)", actionFilter === "urgent" ? "bg-m3-error-container text-m3-error shadow-sm scale-105" : "text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-container-highest/40")}
              >
                Срочные меры ({students.filter(s => s.nextAction.tone === "danger").length})
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid containing filtered cards */}
      {filteredStudents.length === 0 ? (
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest p-8 text-center rounded-lg shadow-m3-soft">
          <CardContent className="space-y-2 py-4">
            <Icon name="manage_search" size={40} className="mx-auto text-m3-outline" />
            <p className="font-label-lg text-label-lg text-m3-on-surface">Нет слушателей, удовлетворяющих условиям поиска</p>
            <p className="font-body-sm text-body-sm text-m3-on-surface-variant">
              Попробуйте сбросить фильтры или изменить поисковый запрос.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredStudents.map((student) => (
            <article
              key={student.assignmentId}
              className={cn(
                "rounded-lg border p-4 transition-colors",
                ACTION_TONE_CLASSES[student.nextAction.tone]
              )}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex items-start gap-3">
                  <Avatar name={student.name} className="h-11 w-11 shadow-sm" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-label-lg text-label-lg text-m3-on-surface">{student.name}</h3>
                      <StatusBadge status={student.progressStatus} label={PROGRESS_LABELS[student.progressStatus]} />
                      {student.highestRiskSeverity && (
                        <button 
                          onClick={() => setDiagStudent(student)}
                          className="hover:scale-105 transition-transform focus:outline-none"
                          title="Кликните для диагностики риска"
                        >
                          <StatusBadge
                            status={student.highestRiskSeverity}
                            label={RISK_LABELS[student.highestRiskSeverity]}
                          />
                        </button>
                      )}
                    </div>
                    <p className="truncate font-body-sm text-body-sm text-m3-on-surface-variant">{student.email}</p>
                    <p className="mt-1 truncate font-body-md text-body-md text-m3-on-surface-variant">
                      {student.courseTitle} · {student.cohortName}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleOpenChat(student)}>
                    <Icon name="chat" className="text-[18px]" />
                    Чат
                  </Button>
                  <ActionButton student={student} onChat={() => handleOpenChat(student)} />
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
                <div className="min-w-0 rounded-lg border border-m3-outline-variant bg-m3-surface-container-low p-3">
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
                <div className="min-w-0 rounded-lg border border-m3-outline-variant bg-m3-surface-container-low p-3">
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
      )}

      {/* 1. Quick Chat Dialog with pre-filled intervention templates support */}
      <Dialog open={Boolean(chatStudent)} onOpenChange={(open) => !open && setChatStudent(null)}>
        {chatStudent && (
          <DialogContent className="max-w-3xl overflow-hidden border-m3-outline-variant bg-m3-surface-container-lowest p-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-headline-sm text-m3-on-surface">Чат: {chatStudent.name}</DialogTitle>
              <DialogDescription className="font-body-md text-body-md text-m3-on-surface-variant">
                Быстрый диалог со слушателем. Сообщение сохранит контекст последнего урока, если он есть.
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
                initialText={chatInitialText}
              />
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* 2. Interactive Risk Diagnostics Modal (RiskDiagnosticDialog) */}
      <Dialog open={Boolean(diagStudent)} onOpenChange={(open) => !open && setDiagStudent(null)}>
        {diagStudent && (
          <DialogContent className="max-w-xl overflow-hidden border-m3-outline-variant bg-m3-surface-container-lowest">
            <DialogHeader className="p-6 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-m3-error/10 text-m3-error">
                  <Icon name="analytics" size={22} />
                </span>
                <div>
                  <DialogTitle className="text-headline-sm text-m3-on-surface">Диагностическая карта риска</DialogTitle>
                  <DialogDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">
                    {diagStudent.name} · Анализ причин и готовые шаблоны писем поддержки
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {/* Risk Diagnostics Breakdown Matrix */}
              <div className="rounded-lg border border-m3-outline-variant bg-m3-surface-container-low p-4 space-y-3">
                <h4 className="text-label-md font-semibold text-m3-on-surface">Показатели успеваемости и активности</h4>
                
                {/* Metric 1: Activity */}
                <div className="flex items-start justify-between text-body-sm font-body-sm">
                  <span className="text-m3-on-surface-variant">Посещаемость:</span>
                  <span className="font-semibold flex items-center gap-1">
                    {diagStudent.daysSinceLogin === null || diagStudent.daysSinceLogin > 7 ? (
                      <span className="text-m3-error flex items-center gap-0.5">
                        <Icon name="error" size={14} />
                        Отсутствует {diagStudent.daysSinceLogin ?? "более 7"} дн.
                      </span>
                    ) : (
                      <span className="text-emerald-600 flex items-center gap-0.5">
                        <Icon name="check_circle" size={14} />
                        Активен ({formatLastLogin(diagStudent.daysSinceLogin)})
                      </span>
                    )}
                  </span>
                </div>

                {/* Metric 2: Deadlines */}
                <div className="flex items-start justify-between text-body-sm font-body-sm">
                  <span className="text-m3-on-surface-variant">Ближайший дедлайн:</span>
                  <span className="font-semibold">
                    {diagStudent.nextDeadline?.overdue ? (
                      <span className="text-m3-error flex items-center gap-0.5">
                        <Icon name="warning" size={14} />
                        Просрочен на {Math.abs(diagStudent.nextDeadline.daysLeft)} дн.
                      </span>
                    ) : diagStudent.nextDeadline ? (
                      <span className="text-m3-on-surface">
                        Активен ({formatDate(diagStudent.nextDeadline.dueAt)})
                      </span>
                    ) : (
                      <span className="text-m3-on-surface-variant/70">Дедлайнов нет</span>
                    )}
                  </span>
                </div>

                {/* Metric 3: Progress percentage */}
                <div className="flex items-start justify-between text-body-sm font-body-sm">
                  <span className="text-m3-on-surface-variant">Прогресс по курсу:</span>
                  <span className="font-semibold">
                    {diagStudent.progressPercent < 15 ? (
                      <span className="text-amber-500">{diagStudent.progressPercent}% (низкий темп)</span>
                    ) : (
                      <span className="text-emerald-600">{diagStudent.progressPercent}% (хороший темп)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Action Intervention Templates Selection */}
              <div className="space-y-3">
                <h4 className="text-label-lg font-label-lg text-m3-on-surface">Шаблоны интервенций куратора</h4>
                <p className="text-body-sm text-m3-on-surface-variant">
                  Выберите подходящее персональное сообщение. Оно автоматически откроется в чате со слушателем:
                </p>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {/* Template 1: Inactivity Reminder */}
                  <button
                    onClick={() => handleSendTemplateText(
                      diagStudent, 
                      `Привет, ${diagStudent.name}! Заметил, что ты давно не заходил на курс "${diagStudent.courseTitle}". Все ли в порядке? Если возникли сложности или нужна помощь куратора — напиши мне, я с радостью помогу! 😊`
                    )}
                    className="w-full text-left p-3 rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest hover:bg-m3-surface-container-low transition-colors space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-label-sm font-semibold text-m3-primary">Напоминание об активности</span>
                      <Icon name="arrow_forward" size={14} className="text-m3-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-body-xs text-m3-on-surface-variant line-clamp-2 italic">
                      «Привет, {diagStudent.name}! Заметил, что ты давно не заходил на курс...»
                    </p>
                  </button>

                  {/* Template 2: Overdue Deadline Intervention */}
                  <button
                    onClick={() => handleSendTemplateText(
                      diagStudent, 
                      `Привет, ${diagStudent.name}! Напоминаю, что у тебя есть активная задача "${diagStudent.nextDeadline?.title || "по курсу"}". Давай постараемся сдать её в ближайшее время, чтобы не отставать от программы. Нужна ли помощь куратора? 👍`
                    )}
                    className="w-full text-left p-3 rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest hover:bg-m3-surface-container-low transition-colors space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-label-sm font-semibold text-m3-primary">Помощь с дедлайном</span>
                      <Icon name="arrow_forward" size={14} className="text-m3-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-body-xs text-m3-on-surface-variant line-clamp-2 italic">
                      «Привет, {diagStudent.name}! Напоминаю, что у тебя есть задача...»
                    </p>
                  </button>

                  {/* Template 3: Motivational Praise */}
                  <button
                    onClick={() => handleSendTemplateText(
                      diagStudent, 
                      `Привет, ${diagStudent.name}! Поздравляю с отличным прогрессом по курсу "${diagStudent.courseTitle}" (уже ${diagStudent.progressPercent}%)! Ты отлично справляешься. Так держать! 🚀`
                    )}
                    className="w-full text-left p-3 rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest hover:bg-m3-surface-container-low transition-colors space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-label-sm font-semibold text-m3-primary">Мотивирующая похвала</span>
                      <Icon name="arrow_forward" size={14} className="text-m3-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-body-xs text-m3-on-surface-variant line-clamp-2 italic">
                      «Привет, {diagStudent.name}! Поздравляю с отличным прогрессом...»
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
