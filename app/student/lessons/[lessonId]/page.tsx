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

<<<<<<< HEAD
  try {
    const lesson = await getLessonForStudent(user.id, lessonId);
    return (
      <AppShell role="student">
        <StudentLessonView lesson={lesson} />
      </AppShell>
    );
=======
  let lesson;
  try {
    lesson = await getLessonForStudent(user.id, lessonId);
>>>>>>> e63fa65c366d6aebc4d97c18216ba9069a19a7c2
  } catch (error) {
    if (error instanceof ApiError && error.code === "not_found") {
      notFound();
    }
    if (error instanceof ApiError && error.code === "forbidden") {
      redirect("/403");
    }
    throw error;
  }
<<<<<<< HEAD
=======

  return (
    <AppShell role="student">
      <StudentLessonView lesson={lesson} />
    </AppShell>
  );
>>>>>>> e63fa65c366d6aebc4d97c18216ba9069a19a7c2
}
