import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getInstructorCoursesForDeadlines } from "@/server/modules/deadlines/service";
import { InstructorDeadlinesClient } from "./client";

export const metadata = {
  title: "Дедлайны — Инструктор",
  description: "Управление сроками и дедлайнами.",
};


export const dynamic = "force-dynamic";

export default async function InstructorDeadlinesPage() {
  const user = await requireRolePage(["instructor", "admin"]);

  const courses = await getInstructorCoursesForDeadlines(user.id);

  return (
    <AppShell role="instructor">
      <PageHeader
        title="Дедлайны блоков"
        description="Установите рекомендованные даты завершения блоков для потоков ваших курсов."
      />
      <div className="mt-6">
        {courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              У вас нет курсов. Создайте курс, чтобы управлять дедлайнами.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {courses.map((course) => (
              <Card key={course.id}>
                <CardHeader>
                  <CardTitle>{course.title}</CardTitle>
                  <CardDescription>
                    {course.cohorts.length > 0
                      ? `Потоки: ${course.cohorts.map((c) => c.name).join(", ")}`
                      : "Нет потоков"}
                  </CardDescription>
                </CardHeader>
                {course.cohorts.length > 0 && (
                  <CardContent>
                    {course.cohorts.map((cohort) => (
                      <div key={cohort.id} className="mb-4 last:mb-0">
                        <InstructorDeadlinesClient
                          cohortId={cohort.id}
                          cohortName={cohort.name}
                        />
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
