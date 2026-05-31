import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getInstructorAssignmentEditData } from "@/server/modules/page-data/service";
import { AssignmentEditForm } from "@/components/instructor/assignment-edit-form";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Редактирование задания — Инструктор",
  description: "Редактирование параметров задания.",
};


export const dynamic = "force-dynamic";

export default async function InstructorEditAssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
 await requireRolePage(["instructor", "admin"]);
 const { assignmentId } = await params;

 const assignment = await getInstructorAssignmentEditData(assignmentId);

 if (!assignment) notFound();

 return (
  <AppShell role="instructor">
   <PageHeader 
    title="Редактор задания" 
    description={`Редактирование задания: ${assignment.title}. Настройте инструкции и критерии оценки.`} 
  />

   <div className="mt-8">
    <AssignmentEditForm assignment={assignment as unknown as Parameters<typeof AssignmentEditForm>[0]["assignment"]}/>
   </div>
  </AppShell>
 );
}
