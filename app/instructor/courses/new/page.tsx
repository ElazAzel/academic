import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { CreateCourseForm } from "@/components/admin/create-course-form";
import { requireRolePage } from "@/lib/auth/page-guards";

export const dynamic = "force-dynamic";

export default async function InstructorNewCoursePage() {
 await requireRolePage(["instructor", "admin"]);

 return (
  <AppShell role="instructor">
   <PageHeader title="Создать курс" description="Создайте новый курс и добавьте модули и уроки."/>
   <div className="mt-6 max-w-3xl">
    <CreateCourseForm/>
   </div>
  </AppShell>
 );
}
