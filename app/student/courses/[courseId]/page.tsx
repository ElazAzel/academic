import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, BookOpen, PauseCircle } from "lucide-react";
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

export const dynamic = "force-dynamic";

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

  return (
    <AppShell role="student">
      <Breadcrumbs items={[
        { href: "/student/my-courses", label: "Мои курсы" },
        { label: course.title },
      ]} />

      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/student/my-courses"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Назад к курсам
          </Link>
        </div>
        {nextLessonId && !isPaused && (
          <Button asChild size="sm">
            <Link href={`/student/lessons/${nextLessonId}`}>
              Продолжить обучение
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      {/* Paused banner */}
      {isPaused && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
          <PauseCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Ваше обучение приостановлено</p>
            <p className="text-xs text-amber-700">Обратитесь к администратору для возобновления доступа.</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty ? (
        <EmptyState
          icon={BookOpen}
          title="В этом курсе пока нет модулей"
          description="Модули появятся здесь после того, как преподаватель опубликует их."
        />
      ) : (
        /* Two-column layout */
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Left: Course sidebar */}
          <CourseSidebar detail={detail} />

          {/* Right: Module accordion */}
          <main>
            <ModuleAccordion
              modules={modules}
              defaultModuleId={
                nextLessonId
                  ? modules.find((m) => m.lessons.some((l) => l.id === nextLessonId))?.id
                  : undefined
              }
            />

            {/* All completed */}
            {isAllCompleted && (
              <div className="mt-6 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Курс завершён!</p>
                  <p className="text-xs text-emerald-700">Вы прошли все уроки курса.</p>
                </div>
                <Button asChild size="sm" variant="primary">
                  <Link href="/student/certificates">
                    Получить сертификат
                  </Link>
                </Button>
              </div>
            )}
          </main>
        </div>
      )}
    </AppShell>
  );
}
