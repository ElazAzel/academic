import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  PlayCircle,
  Video,
} from "lucide-react";
import type { LessonSummary, ModuleDetail } from "@/types/domain";

// TODO: Replace with server action getCourseForStudent(courseId)
function getMockCourse(courseId: string) {
  const modules: ModuleDetail[] = [
    {
      id: "m1",
      order: 1,
      title: "Модуль 1: Стратегия AI",
      description: "Основы AI-стратегии для бизнес-решений.",
      lessonsCount: 3,
      recommendedDays: 7,
      status: "PUBLISHED",
      lessons: [
        { id: "l1", order: 1, title: "Введение в AI-стратегию", type: "VIDEO", durationMinutes: 25, isRequired: true, progressStatus: "COMPLETED", progressPercent: 100 },
        { id: "l2", order: 2, title: "Ландшафт AI-технологий", type: "VIDEO", durationMinutes: 30, isRequired: true, progressStatus: "COMPLETED", progressPercent: 100 },
        { id: "l3", order: 3, title: "Тест: Основы стратегии", type: "QUIZ", durationMinutes: 15, isRequired: true, progressStatus: "COMPLETED", progressPercent: 100 },
      ],
    },
    {
      id: "m2",
      order: 2,
      title: "Модуль 2: Практика",
      description: "Применение AI на практике: ROI, внедрение, риски.",
      lessonsCount: 4,
      recommendedDays: 10,
      status: "PUBLISHED",
      lessons: [
        { id: "l4", order: 1, title: "ROI от AI-проектов", type: "VIDEO", durationMinutes: 35, isRequired: true, progressStatus: "COMPLETED", progressPercent: 100 },
        { id: "l5", order: 2, title: "Unit-экономика AI", type: "VIDEO_DOCUMENT", durationMinutes: 40, isRequired: true, progressStatus: "IN_PROGRESS", progressPercent: 60 },
        { id: "l6", order: 3, title: "Управление рисками AI", type: "VIDEO", durationMinutes: 30, isRequired: true, progressStatus: "NOT_STARTED", progressPercent: 0 },
        { id: "l7", order: 4, title: "Практическое задание: План внедрения", type: "ASSIGNMENT", durationMinutes: 60, isRequired: true, progressStatus: "NOT_STARTED", progressPercent: 0 },
      ],
    },
    {
      id: "m3",
      order: 3,
      title: "Модуль 3: Финальный проект",
      description: "Итоговое задание и сертификация.",
      lessonsCount: 2,
      recommendedDays: 14,
      status: "PUBLISHED",
      lessons: [
        { id: "l8", order: 1, title: "Подготовка финального проекта", type: "TEXT", durationMinutes: 20, isRequired: true, progressStatus: "BLOCKED", progressPercent: 0 },
        { id: "l9", order: 2, title: "Защита и сертификат", type: "ASSIGNMENT", durationMinutes: 90, isRequired: true, progressStatus: "BLOCKED", progressPercent: 0 },
      ],
    },
  ];

  return {
    id: courseId,
    slug: "ai-strategy-fundamentals",
    title: "AI Strategy Fundamentals",
    description: "Практический курс по AI-стратегии для руководителей и менеджеров. 3 модуля, 9 уроков, финальный проект.",
    goal: "Помочь руководителям внедрять AI безопасно и результативно.",
    durationHours: 18,
    status: "PUBLISHED" as const,
    traversalMode: "sequential" as const,
    completionThreshold: 85,
    modulesCount: 3,
    lessonsCount: 9,
    instructors: [
      { id: "u-instr1", name: "Алия Нурланова", email: "instructor1@academy.local" },
      { id: "u-instr2", name: "Иван Петров", email: "instructor2@academy.local" },
    ],
    modules,
    coursePercent: 45,
  };
}

const LESSON_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  VIDEO: Video,
  VIDEO_DOCUMENT: PlayCircle,
  QUIZ: FileText,
  ASSIGNMENT: FileText,
  TEXT: BookOpen,
  MIXED: BookOpen,
};

const STATUS_ICON = {
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  IN_PROGRESS: <PlayCircle className="h-4 w-4 text-primary" />,
  NOT_STARTED: <Clock className="h-4 w-4 text-muted-foreground" />,
  BLOCKED: <Lock className="h-4 w-4 text-muted-foreground/50" />,
};

export default function StudentCoursePage({ params }: { params: { courseId: string } }) {
  const course = getMockCourse(params.courseId);
  const completedLessons = course.modules.flatMap((m) => m.lessons).filter((l) => l.progressStatus === "COMPLETED").length;

  return (
    <AppShell role="student">
      <PageHeader title={course.title} description={course.description} badge="Курс" />

      <div className="space-y-6">
        {/* Прогресс курса */}
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent">
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Общий прогресс</span>
                <span className="font-medium">{course.coursePercent}%</span>
              </div>
              <Progress value={course.coursePercent} />
              <p className="text-xs text-muted-foreground">
                {completedLessons} из {course.lessonsCount} уроков · {course.durationHours} ч. · {course.modulesCount} модулей
              </p>
            </div>
            <div className="flex items-center gap-2">
              {course.instructors.map((i) => (
                <div key={i.id} className="flex items-center gap-2">
                  <Avatar name={i.name} className="h-7 w-7 text-[10px]" />
                  <span className="text-xs text-muted-foreground hidden sm:inline">{i.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {course.goal && (
          <Card>
            <CardContent className="py-4">
              <p className="text-sm"><span className="font-medium text-primary">Цель:</span> {course.goal}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Порог сертификации: {course.completionThreshold}% · Режим: {course.traversalMode === "sequential" ? "Последовательный" : "Свободный"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Модули */}
        <div className="space-y-4">
          {course.modules.map((mod) => {
            const modCompleted = mod.lessons.filter((l) => l.progressStatus === "COMPLETED").length;
            const modPercent = mod.lessonsCount > 0 ? Math.round((modCompleted / mod.lessonsCount) * 100) : 0;
            const isAllCompleted = modPercent === 100;

            return (
              <Card key={mod.id} className="rounded-2xl transition-shadow hover:shadow-panel">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={isAllCompleted ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-sky-200 bg-sky-50 text-sky-700"}>
                      {isAllCompleted ? "Завершён" : `${modPercent}%`}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{mod.recommendedDays} дн.</span>
                  </div>
                  <CardTitle className="text-lg">{mod.title}</CardTitle>
                  {mod.description && <CardDescription>{mod.description}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-1">
                  {mod.lessons.map((lesson) => {
                    const Icon = LESSON_ICONS[lesson.type] ?? BookOpen;
                    const isBlocked = lesson.progressStatus === "BLOCKED";
                    return (
                      <div key={lesson.id}>
                        {lesson.order > 1 && <Separator className="my-1" />}
                        <Link
                          href={isBlocked ? "#" : `/student/lessons/${lesson.id}`}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                            isBlocked
                              ? "cursor-not-allowed opacity-50"
                              : "hover:bg-muted"
                          }`}
                          aria-disabled={isBlocked}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 shrink-0">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{lesson.title}</p>
                            <p className="text-xs text-muted-foreground">{lesson.durationMinutes} мин.</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {lesson.progressStatus && STATUS_ICON[lesson.progressStatus]}
                            {!isBlocked && lesson.progressStatus !== "COMPLETED" && (
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
