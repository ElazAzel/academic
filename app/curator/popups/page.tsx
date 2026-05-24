import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { maskStudentName } from "@/lib/utils";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { CuratorPopupClient } from "./client";

export const metadata = {
  title: "Всплывающие окна — Куратор",
  description: "Управление всплывающими окнами.",
};


const prisma = getPrisma();

export const dynamic = "force-dynamic";

export default async function CuratorPopupsPage() {
  const user = await requireRolePage(["curator"]);

  // Get students assigned to this curator
  const assignments = await prisma.curatorAssignment.findMany({
    where: { curatorId: user.id, active: true },
    select: {
      studentId: true,
      student: { select: { id: true, name: true, email: true } },
      cohort: { select: { id: true, name: true, course: { select: { title: true } } } },
    },
    orderBy: { assignedAt: "desc" },
  });

  const students = assignments.map((a) => ({
    id: a.student.id,
    name: maskStudentName(a.student.id),
    email: a.student.email,
    cohortName: a.cohort.name,
    courseTitle: a.cohort.course?.title ?? "",
  }));

  return (
    <AppShell role="curator">
      <PageHeader
        title="Уведомления слушателям"
        description="Создавайте всплывающие уведомления для своих слушателей."
      />
      <div className="mt-6">
        {students.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              У вас нет закреплённых слушателей.
            </CardContent>
          </Card>
        ) : (
          <CuratorPopupClient students={students} curatorId={user.id} />
        )}
      </div>
    </AppShell>
  );
}
