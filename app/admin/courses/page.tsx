import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { CourseManageGrid } from "@/components/lms/dashboard-widgets";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { listCourses } from "@/server/modules/courses/service";
import { requireRolePage } from "@/lib/auth/page-guards";
import type { CourseSummary } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  await requireRolePage(["admin"]);
  const coursesDb = await listCourses();
  
  const courses: CourseSummary[] = coursesDb.map(course => ({
    id: course.id,
    title: course.title,
    description: course.description ?? "",
    status: course.status as any,
    modulesCount: course.modules.length,
    lessonsCount: course.modules.reduce((acc, m) => acc + m.lessons.length, 0),
    durationHours: course.durationHours,
    instructors: course.instructors.map(i => ({
      id: i.userId,
      name: i.user.name ?? i.user.email,
      email: i.user.email
    }))
  }));

  return (
    <AppShell role="admin">
      <PageHeader title="Курсы" description="Все курсы академии: создание, публикация и управление." badge="Администратор" />
      <div className="space-y-6 mt-6">
        <Button><Plus className="h-4 w-4 mr-2" />Создать курс</Button>
        <CourseManageGrid courses={courses} />
      </div>
    </AppShell>
  );
}
