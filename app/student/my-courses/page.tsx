import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { CourseProgressGrid } from "@/components/lms/dashboard-widgets";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { MOCK_STUDENT_PROGRESS } from "@/lib/mock-data";

export default function StudentMyCoursesPage() {
  const courses = MOCK_STUDENT_PROGRESS;

  return (
    <AppShell role="student">
      <PageHeader title="Мои курсы" description="Назначенные академией курсы, потоки и текущий прогресс." badge="Слушатель" />
      {courses.length > 0 ? (
        <CourseProgressGrid courses={courses} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">У вас пока нет назначенных курсов.</p>
            <p className="text-xs text-muted-foreground">Обратитесь к администратору для получения доступа.</p>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
