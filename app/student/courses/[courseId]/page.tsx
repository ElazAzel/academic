import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, BookOpen, CheckCircle2, PauseCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumbs } from "@/components/lms/breadcrumbs";
import { CourseSidebar } from "@/components/lms/course-sidebar";
import { ModuleAccordion } from "@/components/lms/module-accordion";
import { EmptyState } from "@/components/lms/empty-state";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/http";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getStudentCoursePlayerDetail } from "@/server/modules/learning/service";
import { FORBIDDEN_ROUTE } from "@/lib/constants";
import type { LessonPlayerCard, ModulePlayerDetail } from "@/types/domain";

export const metadata = {
  title: "Курс — Студент",
  description: "Содержимое и прогресс курса.",
};


export const dynamic = "force-dynamic";

const deadlineFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

function findNextLesson(modules: ModulePlayerDetail[], nextLessonId?: string) {
  if (!nextLessonId) return null;

  for (const moduleItem of modules) {
    const lesson = moduleItem.lessons.find((item) => item.id === nextLessonId);
    if (lesson) {
      return { lesson, module: moduleItem };
    }
  }

  return null;
}

function findNearestDeadline(modules: ModulePlayerDetail[]) {
  return modules
    .map((moduleItem) => moduleItem.deadline ? { module: moduleItem, deadline: moduleItem.deadline } : null)
    .filter((item): item is { module: ModulePlayerDetail; deadline: NonNullable<ModulePlayerDetail["deadline"]> } => Boolean(item))
    .sort((a, b) => new Date(a.deadline.date).getTime() - new Date(b.deadline.date).getTime())[0] ?? null;
}

function formatModuleLabel(moduleItem: ModulePlayerDetail) {
  const title = moduleItem.title.trim();
  return /^модуль\s+\d+/iu.test(title) ? title : `Модуль ${moduleItem.order}: ${title}`;
}

function StudentCourseNextStep({
  courseId,
  isPaused,
  isAllCompleted,
  modules,
  nextLesson,
}: {
  courseId: string;
  isPaused: boolean;
  isAllCompleted: boolean;
  modules: ModulePlayerDetail[];
  nextLesson: { lesson: LessonPlayerCard; module: ModulePlayerDetail } | null;
}) {
  const nearestDeadline = findNearestDeadline(modules);

  if (isPaused) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900" aria-labelledby="course-next-step-heading">
        <div className="flex items-start gap-3">
          <PauseCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h2 id="course-next-step-heading" className="text-title-sm font-title-sm">Обучение приостановлено</h2>
            <p className="mt-1 text-body-sm font-body-sm text-amber-800">
              Доступ к урокам временно закрыт. Обратитесь к администратору академии для возобновления обучения.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (isAllCompleted) {
    return (
      <section className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900" aria-labelledby="course-next-step-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id="course-next-step-heading" className="text-title-sm font-title-sm">Курс завершён</h2>
              <p className="mt-1 text-body-sm font-body-sm text-emerald-800">Все доступные уроки курса пройдены.</p>
            </div>
          </div>
          <Button asChild size="sm" variant="primary" className="w-full sm:w-auto">
            <Link href="/student/certificates">Перейти к сертификатам</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest p-5 shadow-m3-soft" aria-labelledby="course-next-step-heading">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-label-md font-label-md text-m3-primary">Следующий шаг</p>
          <h2 id="course-next-step-heading" className="text-pretty text-title-lg font-title-lg text-m3-on-surface">
            {nextLesson ? nextLesson.lesson.title : "Дождитесь публикации следующего урока"}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-label-md font-label-md text-m3-on-surface-variant">
            {nextLesson && (
              <>
                <span className="rounded-md bg-m3-surface-container-high px-2 py-1">
                  {formatModuleLabel(nextLesson.module)}
                </span>
                <span className="rounded-md bg-m3-surface-container-high px-2 py-1">
                  {nextLesson.lesson.durationMinutes} мин.
                </span>
                {nextLesson.lesson.blockTitle && (
                  <span className="rounded-md bg-m3-surface-container-high px-2 py-1">
                    Блок {nextLesson.lesson.blockOrder}: {nextLesson.lesson.blockTitle}
                  </span>
                )}
              </>
            )}
            {nearestDeadline && (
              <span className="rounded-md bg-m3-secondary-fixed px-2 py-1 text-m3-secondary">
                Дедлайн модуля: {deadlineFormatter.format(new Date(nearestDeadline.deadline.date))}
              </span>
            )}
          </div>
        </div>
        {nextLesson ? (
          <Button asChild size="lg" className="w-full whitespace-nowrap xl:w-auto">
            <Link href={`/student/lessons/${nextLesson.lesson.id}`}>
              Открыть урок
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="secondary" className="w-full whitespace-nowrap xl:w-auto">
            <Link href={`/student/courses/${courseId}`}>Обновить страницу</Link>
          </Button>
        )}
      </div>
    </section>
  );
}

export default async function StudentCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const user = await requireRolePage(["student"]);
  const { courseId } = await params;

  let detail;
  try {
    detail = await getStudentCoursePlayerDetail(user.id, courseId);
  } catch (error) {
    if (error instanceof ApiError && error.code === "not_found") notFound();
    if (error instanceof ApiError && error.code === "forbidden") redirect(FORBIDDEN_ROUTE);
    throw error;
  }

  const { course, enrollment, progress, modules, nextLessonId } = detail;
  const isPaused = enrollment === "PAUSED";
  const isEmpty = modules.length === 0;
  const isAllCompleted = progress.percent >= 100;
  const nextLesson = findNextLesson(modules, nextLessonId);

  return (
    <AppShell role="student">
      <Breadcrumbs items={[
        { href: "/student/my-courses", label: "Мои курсы" },
        { label: course.title },
      ]} />

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/student/my-courses"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary"
          >
            <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
            Назад к курсам
          </Link>
        </div>
        {nextLessonId && !isPaused && (
          <Button asChild size="sm">
            <Link href={`/student/lessons/${nextLessonId}`}>
              Продолжить обучение
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>

      {/* Empty state */}
      {isEmpty ? (
        <EmptyState
          icon={BookOpen}
          title="В этом курсе пока нет модулей"
          description="Модули появятся здесь после того, как преподаватель опубликует их."
        />
      ) : (
        <div className="student-course-player-grid grid gap-6">
          <CourseSidebar detail={detail} />

          <main className="student-course-player-main min-w-0 space-y-5">
            <StudentCourseNextStep
              courseId={courseId}
              isPaused={isPaused}
              isAllCompleted={isAllCompleted}
              modules={modules}
              nextLesson={nextLesson}
            />
            <ModuleAccordion
              modules={modules}
              defaultModuleId={
                nextLessonId
                  ? modules.find((m) => m.lessons.some((l) => l.id === nextLessonId))?.id
                  : undefined
              }
            />

          </main>
        </div>
      )}
    </AppShell>
  );
}
