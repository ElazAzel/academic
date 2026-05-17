import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Shuffle } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getSuperCuratorDistributionData } from "@/server/actions/super-curator";
import { AssignCuratorForm } from "./assign-curator-form";

export const dynamic = "force-dynamic";

export default async function SuperCuratorDistributionPage() {
  await requireRolePage(["super_curator", "admin"]);
  const data = await getSuperCuratorDistributionData();

  return (
    <AppShell role="super_curator">
      <PageHeader
        title="Распределение слушателей"
        description="Назначение и перераспределение только в зоне ответственности супер-куратора."
      />

      <div className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Доступные кураторы</CardTitle>
            </div>
            <CardDescription>
              В списке только кураторы, которые уже входят в вашу операционную зону.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.curators.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Нет кураторов в вашей зоне ответственности.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.curators.map((curator) => (
                  <div key={curator.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{curator.name ?? curator.email}</p>
                        <p className="truncate text-xs text-muted-foreground">{curator.email}</p>
                      </div>
                      <Badge variant="outline">{curator.studentCount} слуш.</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Слушатели без куратора</CardTitle>
            </div>
            <CardDescription>
              {data.unassignedStudents.length} слушателей в ваших потоках ожидают назначения куратора.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.unassignedStudents.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                В ваших потоках нет слушателей без активного куратора.
              </p>
            ) : (
              data.unassignedStudents.map((student) => (
                <div key={`${student.cohortId}:${student.id}`} className="flex flex-col gap-4 rounded-xl border p-4 transition-shadow hover:shadow-sm lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {student.courseTitle} · {student.cohortName}
                    </p>
                  </div>
                  <AssignCuratorForm
                    studentId={student.id}
                    cohortId={student.cohortId}
                    curators={data.curators}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shuffle className="h-5 w-5 text-sky-600" />
              <CardTitle className="text-base">Перераспределение нагрузки</CardTitle>
            </div>
            <CardDescription>
              Переназначение доступно только между кураторами из вашей зоны ответственности.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.assignedStudents.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Нет закрепленных слушателей для перераспределения.
              </p>
            ) : (
              data.assignedStudents.map((student) => (
                <div key={`${student.cohortId}:${student.id}`} className="flex flex-col gap-4 rounded-xl border p-4 transition-shadow hover:shadow-sm lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Поток: <span className="font-medium text-foreground">{student.cohortName}</span> · текущий куратор:{" "}
                      <span className="font-medium text-foreground">{student.curatorName}</span>
                    </p>
                  </div>
                  <AssignCuratorForm
                    studentId={student.id}
                    cohortId={student.cohortId}
                    curators={data.curators}
                    currentCuratorId={student.curatorId}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
