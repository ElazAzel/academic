import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { RisksList } from "@/components/lms/dashboard-widgets";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import type { RiskItem } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function SuperCuratorRisksPage() {
 await requireRolePage(["super_curator"]);
 const prisma = getPrisma();

 const riskFlagsDb = await prisma.riskFlag.findMany({
  where: { resolvedAt: null },
  include: { user: true, course: true },
  orderBy: { createdAt: "desc" },
  take: 200,
 });

 const risks: RiskItem[] = riskFlagsDb.map((risk) => ({
  id: risk.id,
  studentName: risk.user.name ?? risk.user.email,
  studentEmail: risk.user.email,
  courseTitle: risk.course?.title ?? "Общий",
  type: risk.type as RiskItem["type"],
  severity: risk.severity as RiskItem["severity"],
  status: risk.resolvedAt ? "resolved" : "open",
  createdAt: risk.createdAt.toISOString(),
 }));

 return (
  <AppShell role="super_curator">
   <PageHeader title="Риски по потокам" description="Агрегированные риски всех потоков: неактивные, просроченные, отстающие слушатели."/>
   <RisksList risks={risks}/>
  </AppShell>
 );
}
