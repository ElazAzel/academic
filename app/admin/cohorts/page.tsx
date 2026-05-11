import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Calendar } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { DeleteCohortButton } from "./delete-cohort-button";

const prisma = getPrisma();

export const dynamic = "force-dynamic";

export default async function AdminCohortsPage() {
 await requireRolePage(["admin"]);

 const cohorts = await prisma.cohort.findMany({
  orderBy: { createdAt: "desc" },
  include: {
    course: { select: { title: true } },
    _count: { select: { enrollments: true, curatorAssignments: true } },
  },
 });

 return (
  <AppShell role="admin">
   <PageHeader title="Потоки (когорты)" description="Управление потоками обучения." />
   <div className="flex justify-end mb-6">
    <Button asChild>
     <Link href="/admin/cohorts/new"><Plus className="h-4 w-4 mr-2" />Создать поток</Link>
    </Button>
   </div>
   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {cohorts.length === 0 ? (
     <Card className="md:col-span-2 lg:col-span-3">
      <CardContent className="py-10 text-center text-muted-foreground">
       <Users className="mx-auto h-8 w-8 mb-2 opacity-40" />
       <p>Нет потоков. Создайте первый поток.</p>
      </CardContent>
     </Card>
    ) : cohorts.map((c) => (
     <Card key={c.id} className="transition-all duration-200 hover:shadow-lg">
      <CardHeader className="pb-3">
       <div className="flex items-center justify-between mb-2">
        <Badge className={c.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-600"}>
         {c.status === "active" ? "Активен" : "Архив"}
        </Badge>
        <span className="text-[10px] text-muted-foreground">{c.course?.title}</span>
       </div>
       <CardTitle className="text-base">{c.name}</CardTitle>
       {c.startsAt && (
        <CardDescription className="flex items-center gap-1">
         <Calendar className="h-3 w-3" />
         {c.startsAt.toISOString().slice(0, 10)}{c.endsAt ? ` — ${c.endsAt.toISOString().slice(0, 10)}` : ""}
        </CardDescription>
       )}
      </CardHeader>
      <CardContent>
       <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c._count.enrollments} слушателей</span>
        <span>{c._count.curatorAssignments} кураторов</span>
       </div>
       <div className="flex gap-2">
        <Button asChild variant="secondary" size="sm" className="flex-1">
         <Link href={`/admin/cohorts/${c.id}`}>Редактировать</Link>
        </Button>
        {c.status === "active" && <DeleteCohortButton cohortId={c.id} />}
       </div>
      </CardContent>
     </Card>
    ))}
   </div>
  </AppShell>
 );
}