import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Calendar } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { getSuperCuratorCohorts } from "@/server/actions/super-curator";
import { CreateCohortForm } from "./cohort-form";

const prisma = getPrisma();

export const dynamic = "force-dynamic";

export default async function SuperCuratorCohortsPage() {
  await requireRolePage(["super_curator", "admin"]);
  const cohorts = await getSuperCuratorCohorts();
  const courses = await prisma.course.findMany({ select: { id: true, title: true } });

  return (
    <AppShell role="super_curator">
      <div className="flex items-start justify-between mb-6">
        <PageHeader title="Потоки" description="Управление потоками обучения и их участниками." />
        <CreateCohortForm courses={courses.map((c) => ({ id: c.id, title: c.title }))} />
      </div>

      <div className="space-y-4">
        {cohorts.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-10 text-center text-muted-foreground">
              <Users className="mx-auto h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">Нет созданных потоков. Нажмите &laquo;Создать поток&raquo;.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cohorts.map((c) => (
              <a key={c.id} href={`/super-curator/cohorts/${c.id}`} className="block">
                <Card className="rounded-2xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{c.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {c.courseTitle}
                        </CardDescription>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                        c.status === "active" ? "bg-emerald-50 text-emerald-700" :
                        c.status === "archived" ? "bg-gray-100 text-gray-500" :
                        "bg-amber-50 text-amber-700"
                      }`}>
                        {c.status === "active" ? "Активен" : c.status === "archived" ? "Архив" : "Черновик"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {c.studentsCount} уч.
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {c.curatorCount} кур.
                      </span>
                      {c.startsAt && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(c.startsAt).toLocaleDateString("ru")}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        )}

        {cohorts.filter((c) => c.status !== "archived").length > 0 && (
          <details className="rounded-2xl border p-4">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              Архивные потоки ({cohorts.filter((c) => c.status === "archived").length})
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {cohorts.filter((c) => c.status === "archived").map((c) => (
                <a key={c.id} href={`/super-curator/cohorts/${c.id}`} className="block">
                  <Card className="rounded-xl opacity-70 hover:opacity-100 transition-opacity">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.courseTitle}</p>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </details>
        )}
      </div>
    </AppShell>
  );
}
