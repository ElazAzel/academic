import { AppShell } from "@/components/layout/app-shell";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCourseForBuilder } from "@/server/modules/course-builder/service";
import { CourseBuilderShell } from "@/components/lms/course-builder-shell";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CourseBuilderPage({ params }: { params: Promise<{ courseId: string }> }) {
  await requireRolePage(["instructor", "admin"]);
  const { courseId } = await params;

  let detail;
  try {
    detail = await getCourseForBuilder(courseId, "");
  } catch {
    notFound();
  }

  return (
    <AppShell role="instructor">
      <CourseBuilderShell detail={detail} />
    </AppShell>
  );
}
