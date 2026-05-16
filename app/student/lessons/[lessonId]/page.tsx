import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { LessonPlayerShell } from "@/components/lms/lesson-player-shell";
import { ApiError } from "@/lib/http";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getStudentLessonPlayerDetail } from "@/server/modules/learning/service";
import { FORBIDDEN_ROUTE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function StudentLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const user = await requireRolePage(["student"]);
  const { lessonId } = await params;

  let detail;
  try {
    detail = await getStudentLessonPlayerDetail(user.id, lessonId);
  } catch (error) {
    if (error instanceof ApiError && error.code === "not_found") {
      notFound();
    }
    if (error instanceof ApiError && error.code === "forbidden") {
      redirect(FORBIDDEN_ROUTE);
    }
    throw error;
  }

  return (
    <AppShell role="student">
      <LessonPlayerShell detail={detail} />
    </AppShell>
  );
}
