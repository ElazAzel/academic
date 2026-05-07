import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { RisksList } from "@/components/lms/dashboard-widgets";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import type { RiskItem } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function CuratorRisksPage() {
  const user = await requireRolePage(["curator", "super_curator"]);
  const prisma = getPrisma();

  const assignedStudents = await prisma.curatorAssignment.findMany({
    where: { curatorId: user.id },
    select: { studentId: true }
  });
  const studentIds = assignedStudents.map(a => a.studentId);

  const riskFlagsDb = await prisma.riskFlag.findMany({
    where: { 
      userId: { in: studentIds },
      resolvedAt: null
    },
    include: {
      user: true,
      course: true
    },
    orderBy: { createdAt: "desc" }
  });

  const risks: RiskItem[] = riskFlagsDb.map(risk => ({
    id: risk.id,
    studentName: risk.user.name ?? risk.user.email,
    studentEmail: risk.user.email,
    courseTitle: risk.course?.title ?? "Общий",
    type: risk.type as RiskItem["type"],
    severity: risk.severity as RiskItem["severity"],
    status: risk.resolvedAt ? "resolved" : "open",
    createdAt: risk.createdAt.toISOString()
  }));

  return (
    <AppShell role="curator">
      <PageHeader title="Риски слушателей" description="Слушатели с рисками: неактивные, просроченные, отстающие." badge="Куратор" />
      <div className="mt-6">
        <RisksList risks={risks} />
      </div>
    </AppShell>
  );
}
