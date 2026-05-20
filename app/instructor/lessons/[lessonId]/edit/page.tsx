import { redirect } from "next/navigation";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getLesson } from "@/server/modules/courses/service";

export default async function RedirectToBuilder({ params }: { params: Promise<{ lessonId: string }> }) {
  await requireRolePage(["instructor", "admin"]);
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);
  redirect(`/instructor/courses/${lesson.module.course.id}/builder?lessonId=${lessonId}`);
}
