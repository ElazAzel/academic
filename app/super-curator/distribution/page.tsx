import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
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
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-soft-hover">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Icon name="verified_user" className="text-[22px] text-m3-primary" />
              <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Доступные кураторы</CardTitle>
            </div>
            <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">
              В списке только кураторы, которые уже входят в вашу операционную зону.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.curators.length === 0 ? (
              <p className="py-4 text-center font-body-sm text-body-sm text-m3-on-surface-variant">
                Нет кураторов в вашей зоне ответственности.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.curators.map((curator) => (
                  <div key={curator.id} className="rounded-xl border border-m3-outline-variant bg-m3-surface-container-low p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-label-md text-label-md text-m3-on-surface truncate">{curator.name ?? curator.email}</p>
                        <p className="font-body-sm text-body-sm text-m3-on-surface-variant truncate">{curator.email}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0">{curator.studentCount} слуш.</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-soft-hover">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Icon name="group" className="text-[22px] text-m3-tertiary" />
              <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Слушатели без куратора</CardTitle>
            </div>
            <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">
              {data.unassignedStudents.length} слушателей в ваших потоках ожидают назначения куратора.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.unassignedStudents.length === 0 ? (
              <p className="py-4 text-center font-body-sm text-body-sm text-m3-on-surface-variant">
                В ваших потоках нет слушателей без активного куратора.
              </p>
            ) : (
              data.unassignedStudents.map((student) => (
                <div key={`${student.cohortId}:${student.id}`} className="flex flex-col gap-4 rounded-xl border border-m3-outline-variant bg-m3-surface-container-low p-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-label-md text-label-md text-m3-on-surface">{student.name}</p>
                    <p className="font-body-sm text-body-sm text-m3-on-surface-variant">{student.email}</p>
                    <p className="mt-1 font-body-sm text-body-sm text-m3-on-surface-variant">
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

        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-soft-hover">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Icon name="swap_horiz" className="text-[22px] text-m3-primary" />
              <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Перераспределение нагрузки</CardTitle>
            </div>
            <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">
              Переназначение доступно только между кураторами из вашей зоны ответственности.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.assignedStudents.length === 0 ? (
              <p className="py-4 text-center font-body-sm text-body-sm text-m3-on-surface-variant">
                Нет закрепленных слушателей для перераспределения.
              </p>
            ) : (
              data.assignedStudents.map((student) => (
                <div key={`${student.cohortId}:${student.id}`} className="flex flex-col gap-4 rounded-xl border border-m3-outline-variant bg-m3-surface-container-low p-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-label-md text-label-md text-m3-on-surface">{student.name}</p>
                    <p className="font-body-sm text-body-sm text-m3-on-surface-variant">{student.email}</p>
                    <p className="mt-1 font-body-sm text-body-sm text-m3-on-surface-variant">
                      Поток: <span className="font-label-md text-label-md text-m3-on-surface">{student.cohortName}</span> · текущий куратор:{" "}
                      <span className="font-label-md text-label-md text-m3-on-surface">{student.curatorName}</span>
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
