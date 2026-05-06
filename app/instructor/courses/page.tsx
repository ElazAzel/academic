import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { CourseManageGrid } from "@/components/lms/dashboard-widgets";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MOCK_COURSES } from "@/lib/mock-data";

export default function InstructorCoursesPage() {
  const myCourses = MOCK_COURSES.filter((c) => c.instructors.some((i) => i.id === "u-instr1"));
  return (
    <AppShell role="instructor">
      <PageHeader title="Мои курсы" description="Список ваших курсов с draft/published/archived состояниями." badge="Преподаватель" />
      <div className="space-y-6">
        <Button><Plus className="h-4 w-4" />Создать курс</Button>
        <CourseManageGrid courses={myCourses.length > 0 ? myCourses : MOCK_COURSES} />
      </div>
    </AppShell>
  );
}
