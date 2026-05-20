import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/lms/status-badge";
import { ArrowLeft, Users, Calendar } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { EditCohortForm } from "./edit-cohort-form";
import { DeadlineManager } from "./deadline-manager";

const prisma = getPrisma();

export const dynamic = "force-dynamic";

export default async function EditCohortPage({ params }: { params: Promise<{ cohortId: string }> }) {
 await requireRolePage(["admin"]);
 const { cohortId } = await params;

 const [cohort, courses] = await Promise.all([
  prisma.cohort.findUnique({
   where: { id: cohortId },
   include: {
    course: { select: { title: true } },
    _count: { select: { enrollments: true, curatorAssignments: true } },
   },
  }),
  prisma.course.findMany({
   where: { status: "PUBLISHED" },
   select: { id: true, title: true },
   orderBy: { title: "asc" },
  }),
 ]);

 if (!cohort) notFound();

 return (
  <AppShell role="admin">
   <div className="mb-4">
    <Button asChild variant="ghost" size="sm">
     <Link href="/admin/cohorts"><ArrowLeft className="h-4 w-4 mr-1" /> К потокам</Link>
    </Button>
   </div>
   <PageHeader title={cohort.name} description={`Курс: ${cohort.course?.title}`} />

   <div className="grid gap-6 mt-6 md:grid-cols-2">
    <Card>
     <CardHeader>
      <CardTitle>Редактирование</CardTitle>
      <CardDescription>Измените параметры потока.</CardDescription>
     </CardHeader>
     <CardContent>
      <EditCohortForm cohort={cohort} courses={courses} />
     </CardContent>
    </Card>

    <Card>
     <CardHeader>
      <CardTitle>Статистика</CardTitle>
      <CardDescription>Текущие показатели потока.</CardDescription>
     </CardHeader>
     <CardContent className="space-y-4">
      <div className="flex items-center gap-3">
       <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
        <Users className="h-4 w-4 text-primary" />
       </span>
       <div>
        <p className="text-sm font-medium">{cohort._count.enrollments} слушателей</p>
        <p className="text-xs text-muted-foreground">{cohort._count.curatorAssignments} назначенных кураторов</p>
       </div>
      </div>
      <div className="flex items-center gap-3">
       <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
        <Calendar className="h-4 w-4 text-primary" />
       </span>
       <div>
        <p className="text-sm font-medium">
         {cohort.startsAt ? cohort.startsAt.toISOString().slice(0, 10) : "Нет даты"}
         {cohort.endsAt ? ` — ${cohort.endsAt.toISOString().slice(0, 10)}` : ""}
        </p>
        <StatusBadge status={cohort.status === "active" ? "ACTIVE" : "ARCHIVED"} label={cohort.status === "active" ? "Активен" : "Архив"} />
        </div>
       </div>
      </CardContent>
     </Card>
    </div>

   {/* Deadline Manager */}
   <div className="mt-6">
    <DeadlineManager cohortId={cohort.id} cohortName={cohort.name} />
   </div>
  </AppShell>
 );
}