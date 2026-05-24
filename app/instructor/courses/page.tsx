import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { CourseManageGrid } from "@/components/lms/dashboard-widgets";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { requireRolePage } from "@/lib/auth/page-guards";
import { listCourses } from "@/server/modules/courses/service";
import type { CourseSummary } from "@/types/domain";

export const metadata = {
  title: "Курсы — Инструктор",
  description: "Управление своими курсами.",
};


export const dynamic = "force-dynamic";

export default async function InstructorCoursesPage() {
 const user = await requireRolePage(["instructor", "admin"]);
 const isAdmin = user.roles.includes("admin");

 const coursesDb = await listCourses(undefined, isAdmin ? undefined : user.id);

 const courses: CourseSummary[] = coursesDb.map(course => ({
  id: course.id,
  slug: course.slug,
  title: course.title,
  description: course.description ?? "",
  status: course.status,
  traversalMode: course.traversalMode === "open" ? "open" : "sequential",
  modulesCount: course.modules.length,
  lessonsCount: course.modules.reduce((acc, m) => acc + m.lessons.length, 0),
  durationHours: course.durationHours,
   instructors: course.instructors.map(i => ({
    id: i.user.id,
    name: i.user.name ?? i.user.email,
    email: i.user.email
   }))
 }));

 return (
  <AppShell role="instructor">
   <PageHeader title="Мои курсы" description="Управление статусами (черновик, опубликован, архив) и контентом."/>
   <div className="space-y-6 mt-6">
     <Link href="/instructor/courses/new">
      <Button><Plus className="h-4 w-4 mr-2"/>Создать курс</Button>
     </Link>
    {courses.length > 0 ? (
     <CourseManageGrid courses={courses}/>
    ) : (
     <div className="text-center text-muted-foreground py-10 border rounded-2xl">У вас пока нет курсов.</div>
    )}
   </div>
  </AppShell>
 );
}
