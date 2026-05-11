import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getLesson } from "@/server/modules/courses/service";
import { LessonEditForm } from "@/components/instructor/lesson-edit-form";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InstructorEditLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
 await requireRolePage(["instructor", "admin"]);
 const { lessonId } = await params;
 
 let lesson;
 try {
  lesson = await getLesson(lessonId);
 } catch {
  notFound();
 }

 return (
  <AppShell role="instructor">
   <PageHeader 
    title="Редактор урока" 
    description={`Редактирование урока: ${lesson.title}. Тип: ${lesson.type}.`} 
  />

   <div className="mt-8">
    <LessonEditForm lesson={lesson as unknown as Parameters<typeof LessonEditForm>[0]["lesson"]}/>
   </div>
  </AppShell>
 );
}
