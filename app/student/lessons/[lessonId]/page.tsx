import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StudentLessonView } from "@/components/lms/student-lesson-view";
import { ApiError } from "@/lib/http";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getLessonForStudent } from "@/server/modules/learning/service";

export const dynamic = "force-dynamic";

export default async function StudentLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const user = await requireRolePage(["student"]);
  const { lessonId } = await params;

  let lesson;
  try {
    lesson = await getLessonForStudent(user.id, lessonId);
  } catch (error) {
    if (error instanceof ApiError && error.code === "not_found") {
      notFound();
    }
    if (error instanceof ApiError && error.code === "forbidden") {
      redirect("/403");
    }
    throw error;
  }

  return (
    <AppShell role="student">
      <StudentLessonView lesson={lesson} />
    </AppShell>
  );
}
