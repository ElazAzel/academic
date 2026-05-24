import { AppShell } from "@/components/layout/app-shell";
import { CourseBuilderShell } from "@/components/lms/course-builder-shell";
import { requireRolePage } from "@/lib/auth/page-guards";
import { resolveCourseBuilderSelection } from "@/lib/course-builder-selection";
import { getCourseForBuilder } from "@/server/modules/course-builder/service";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Конструктор курса — Администрирование",
  description: "Редактирование структуры курса.",
};


export const dynamic = "force-dynamic";

export default async function AdminCourseBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ moduleId?: string; blockId?: string; lessonId?: string }>;
}) {
  const user = await requireRolePage(["admin"]);
  const { courseId } = await params;
  const resolvedSearchParams = await searchParams;

  let detail;
  try {
    detail = await getCourseForBuilder(courseId, user.id);
  } catch {
    notFound();
  }

  return (
    <AppShell role="admin">
      <CourseBuilderShell
        detail={detail}
        role="admin"
        initialSelected={resolveCourseBuilderSelection(detail, resolvedSearchParams)}
      />
    </AppShell>
  );
}
