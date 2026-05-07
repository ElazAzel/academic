import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCourse } from "@/server/modules/courses/service";
import { CourseEditForm } from "@/components/instructor/course-edit-form";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InstructorEditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  await requireRolePage(["instructor", "admin"]);
  const { courseId } = await params;
  
  let course;
  try {
    course = await getCourse(courseId);
  } catch (err) {
    notFound();
  }

  return (
    <AppShell role="instructor">
      <div className="mb-4">
        <Link href="/instructor/courses">
          <Button size="sm" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Назад к списку
          </Button>
        </Link>
      </div>

      <PageHeader 
        title={course.title} 
        description="Редактирование основных параметров курса." 
        badge="Преподаватель" 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl border-2">
            <CardHeader>
              <CardTitle className="text-lg">Основные настройки</CardTitle>
            </CardHeader>
            <CardContent>
              <CourseEditForm course={course} />
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-2 border-dashed">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Состав курса (Учебный план)
              </CardTitle>
            </CardHeader>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground text-sm mb-4">Управление модулями и уроками доступно в детальном редакторе.</p>
              <Button disabled variant="outline">Открыть редактор контента</Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-3xl bg-primary/5 border-primary/10">
            <CardHeader>
              <CardTitle className="text-base text-primary">Статистика курса</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Модулей:</span>
                <span className="font-bold">{course.modules.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Всего уроков:</span>
                <span className="font-bold">{course.modules.reduce((acc, m) => acc + m.lessons.length, 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Потоков:</span>
                <span className="font-bold">{course.cohorts.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
