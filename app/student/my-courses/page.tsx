import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { EmptyState } from "@/components/lms/empty-state";
import { CourseProgressGrid } from "@/components/lms/dashboard-widgets";
import { BookOpen } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getStudentCourseCards } from "@/server/modules/learning/service";

export const dynamic = "force-dynamic";

export default async function StudentMyCoursesPage() {
 const user = await requireRolePage(["student"]);
 const courses = await getStudentCourseCards(user.id);

 return (
  <AppShell role="student">
   <PageHeader title="Мои курсы" description="Назначенные академией курсы, потоки и текущий прогресс."/>
   {courses.length > 0 ? (
    <CourseProgressGrid courses={courses}/>
   ) : (
    <EmptyState
     icon={BookOpen}
     title="У вас пока нет назначенных курсов"
     description="Обратитесь к администратору академии для получения доступа."
    />
   )}
  </AppShell>
 );
}
