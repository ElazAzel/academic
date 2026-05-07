import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { AssignmentEditForm } from "@/components/instructor/assignment-edit-form";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InstructorEditAssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  await requireRolePage(["instructor", "admin"]);
  const { assignmentId } = await params;
  const prisma = getPrisma();

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId }
  });

  if (!assignment) notFound();

  return (
    <AppShell role="instructor">
      <PageHeader 
        title="Редактор задания" 
        description={`Редактирование задания: ${assignment.title}. Настройте инструкции и критерии оценки.`} 
        badge="Преподаватель" 
      />

      <div className="mt-8">
        <AssignmentEditForm assignment={assignment as unknown as Parameters<typeof AssignmentEditForm>[0]["assignment"]} />
      </div>
    </AppShell>
  );
}
