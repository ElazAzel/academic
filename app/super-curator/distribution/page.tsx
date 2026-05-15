import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { AssignCuratorForm } from "./assign-curator-form";

const prisma = getPrisma();

export const dynamic = "force-dynamic";

export default async function SuperCuratorDistributionPage() {
 await requireRolePage(["super_curator", "admin"]);
 const user = await getCurrentUser();
 if (!user) return null;

 // Студенты без куратора: enrolled but not in any active curatorAssignment
 const unassignedStudents = await prisma.user.findMany({
  where: {
   roles: { some: { role: { key: "student" } } },
   AND: {
    curatorAssignments: { none: { active: true } }
   }
  },
  select: {
   id: true, name: true, email: true,
   enrollments: {
    where: { status: "ACTIVE" },
    include: { course: { select: { title: true } }, cohort: { select: { id: true, name: true } } },
   },
  },
  orderBy: { name: "asc" },
 });

 // Студенты с куратором: для перераспределения
 const assignedStudents = await prisma.user.findMany({
  where: {
   roles: { some: { role: { key: "student" } } },
    curatorAssignments: { some: { active: true } },
   },
   select: {
    id: true, name: true, email: true,
    curatorAssignments: {
    where: { active: true },
    select: { cohortId: true, curatorId: true, curator: { select: { id: true, name: true, email: true } }, cohort: { select: { id: true, name: true } } },
   },
   enrollments: {
    where: { status: "ACTIVE" },
    include: { course: { select: { title: true } }, cohort: { select: { id: true, name: true } } },
   },
  },
  orderBy: { name: "asc" },
 });

 // Кураторы под этим супер-куратором (или все, если супер-куратор)
 const curators = await prisma.user.findMany({
  where: {
   roles: { some: { role: { key: "curator" } } },
   curatorAssignments: { some: { superCuratorId: user.id, active: true } },
  },
  select: { id: true, name: true, email: true },
  distinct: ["id"],
  orderBy: { name: "asc" },
 });

 // Также получаем всех кураторов на случай, если супер-куратор ещё никого не назначал
 const allCurators = curators.length > 0 ? curators : await prisma.user.findMany({
  where: { roles: { some: { role: { key: "curator" } } } },
  select: { id: true, name: true, email: true },
  orderBy: { name: "asc" },
 });

 return (
  <AppShell role="super_curator">
   <PageHeader title="Распределение слушателей" description="Назначение кураторов нераспределённым слушателям." />
   <div className="space-y-6">
    <Card className="rounded-2xl">
     <CardHeader>
      <div className="flex items-center gap-2">
       <Users className="h-5 w-5 text-amber-600" />
       <CardTitle className="text-base">Нераспределённые слушатели</CardTitle>
      </div>
      <CardDescription>{unassignedStudents.length} слушателей ожидают назначения куратора.</CardDescription>
     </CardHeader>
     <CardContent className="space-y-3">
      {unassignedStudents.length === 0 ? (
       <p className="text-sm text-muted-foreground py-4 text-center">Все слушатели имеют назначенных кураторов.</p>
      ) : unassignedStudents.map((s) => (
       <div key={s.id} className="flex items-center gap-4 rounded-xl border p-4 transition-shadow hover:shadow-sm">
        <div className="flex-1 min-w-0">
         <p className="text-sm font-medium">{s.name ?? s.email}</p>
         <p className="text-xs text-muted-foreground">
          {s.email}
          {s.enrollments.map((e) => ` · ${e.course.title}${e.cohort ? ` (${e.cohort.name})` : ""}`)}
         </p>
        </div>
        {s.enrollments.length > 0 ? (
         <AssignCuratorForm
          studentId={s.id}
          cohortId={s.enrollments[0].cohort?.id ?? ""}
          curators={allCurators}
         />
        ) : (
         <span className="text-xs text-muted-foreground">Нет активных зачислений</span>
        )}
       </div>
      ))}
     </CardContent>
    </Card>

    <Card className="rounded-2xl">
     <CardHeader>
      <CardTitle className="text-base">Перераспределение</CardTitle>
      <CardDescription>Переназначить слушателей между кураторами для балансировки нагрузки.</CardDescription>
     </CardHeader>
     <CardContent className="space-y-3">
      {assignedStudents.length === 0 ? (
       <p className="text-sm text-muted-foreground py-4 text-center">Нет слушателей с назначенными кураторами.</p>
      ) : assignedStudents.map((s) => {
       const assignment = s.curatorAssignments[0];
       return (
        <div key={s.id} className="flex items-center gap-4 rounded-xl border p-4 transition-shadow hover:shadow-sm">
         <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{s.name ?? s.email}</p>
          <p className="text-xs text-muted-foreground">
           {s.email}
           {s.enrollments.map((e) => ` · ${e.course.title}${e.cohort ? ` (${e.cohort.name})` : ""}`)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
           Текущий куратор: <span className="font-medium text-foreground">{assignment.curator.name ?? assignment.curator.email}</span>
           {assignment.cohort ? ` · Поток: ${assignment.cohort.name}` : ""}
          </p>
         </div>
         {assignment ? (
          <AssignCuratorForm
           studentId={s.id}
           cohortId={assignment.cohortId}
           curators={allCurators}
           currentCuratorId={assignment.curatorId}
          />
         ) : null}
        </div>
       );
      })}
     </CardContent>
    </Card>
   </div>
  </AppShell>
 );
}