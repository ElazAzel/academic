import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { CourseProgressGrid } from "@/components/lms/dashboard-widgets";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card>
     <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
      <BookOpen className="h-10 w-10 text-muted-foreground/40"/>
      <p className="text-muted-foreground">У вас пока нет назначенных курсов.</p>
      <p className="text-xs text-muted-foreground">Обратитесь к администратору академии для получения доступа.</p>
     </CardContent>
    </Card>
   )}
  </AppShell>
 );
}
