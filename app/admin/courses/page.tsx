import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { CourseManageGrid } from "@/components/lms/dashboard-widgets";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MOCK_COURSES } from "@/lib/mock-data";

export default function AdminCoursesPage() {
  return (
    <AppShell role="admin">
      <PageHeader title="Курсы" description="Все курсы академии: создание, публикация и управление." badge="Администратор" />
      <div className="space-y-6">
        <Button><Plus className="h-4 w-4" />Создать курс</Button>
        <CourseManageGrid courses={MOCK_COURSES} />
      </div>
    </AppShell>
  );
}
