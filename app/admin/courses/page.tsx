import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { CourseManageGrid } from "@/components/lms/dashboard-widgets";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { listCourses } from "@/server/modules/courses/service";
import { requireRolePage } from "@/lib/auth/page-guards";
import type { CourseSummary } from "@/types/domain";
import { CreateCourseForm } from "@/components/admin/create-course-form";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  await requireRolePage(["admin"]);
  const coursesDb = await listCourses();
  
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
      id: i.userId,
      name: i.user.name ?? i.user.email,
      email: i.user.email
    }))
  }));

  return (
    <AppShell role="admin">
      <PageHeader title="Курсы" description="Все курсы академии: создание, публикация и управление." badge="Администратор" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Список курсов</h2>
          </div>
          <CourseManageGrid courses={courses} />
        </div>
        <div className="lg:col-span-1">
          <CreateCourseForm />
        </div>
      </div>
    </AppShell>
  );
}
