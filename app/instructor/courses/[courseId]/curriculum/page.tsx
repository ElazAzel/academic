import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCourse } from "@/server/modules/courses/service";
import { CurriculumEditor } from "@/components/instructor/curriculum-editor";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CourseCurriculumPage({ params }: { params: Promise<{ courseId: string }> }) {
  await requireRolePage(["instructor", "admin"]);
  const { courseId } = await params;
  
  let course;
  try {
    course = await getCourse(courseId);
  } catch {
    notFound();
  }

  return (
    <AppShell role="instructor">
      <div className="mb-4">
        <Link href={`/instructor/courses/${courseId}/edit`}>
          <Button size="sm" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Назад к настройкам
          </Button>
        </Link>
      </div>

      <PageHeader 
        title="Учебный план" 
        description={`Структура курса: ${course.title}. Добавляйте модули и уроки.`} 
        badge="Преподаватель" 
      />

      <div className="mt-8">
        <CurriculumEditor 
          courseId={courseId} 
          initialModules={course.modules.map(m => ({
            id: m.id,
            title: m.title,
            order: m.order,
            lessons: m.lessons.map(l => ({
              id: l.id,
              title: l.title,
              type: l.type,
              order: l.order
            }))
          }))} 
        />
      </div>
    </AppShell>
  );
}
