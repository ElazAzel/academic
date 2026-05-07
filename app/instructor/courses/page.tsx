import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { CourseManageGrid } from "@/components/lms/dashboard-widgets";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import type { CourseSummary } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function InstructorCoursesPage() {
  const user = await requireRolePage(["instructor", "admin"]);
  const isAdmin = user.roles.includes("admin");
  const prisma = getPrisma();

  const coursesDb = await prisma.course.findMany({
    where: isAdmin ? {} : {
      instructors: { some: { userId: user.id } }
    },
    include: {
      modules: { include: { lessons: true } },
      instructors: { include: { user: true } }
    },
    orderBy: { createdAt: "desc" }
  });

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
    <AppShell role="instructor">
      <PageHeader title="Мои курсы" description="Управление статусами (черновик, опубликован, архив) и контентом." badge="Преподаватель" />
      <div className="space-y-6 mt-6">
        <Button><Plus className="h-4 w-4 mr-2" />Создать курс</Button>
        {courses.length > 0 ? (
          <CourseManageGrid courses={courses} />
        ) : (
          <div className="text-center text-muted-foreground py-10 border rounded-2xl">У вас пока нет курсов.</div>
        )}
      </div>
    </AppShell>
  );
}
