import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart } from "@/components/lms/bar-chart";
import { TrendingUp, Users } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getInstructorStudents } from "@/server/actions/dashboard";

interface StudentRow {
  id: string;
  name: string;
  email: string;
  courseTitle: string;
  cohortName: string | null;
  progress: number;
  progressStatus: string;
  lastLoginAt: string | null;
}

export const dynamic = "force-dynamic";

export default async function InstructorStudentsPage() {
  await requireRolePage(["instructor", "admin"]);
  const students: StudentRow[] = await getInstructorStudents();

  const courseGroups: Record<string, StudentRow[]> = {};
  for (const s of students) {
    if (!courseGroups[s.courseTitle]) courseGroups[s.courseTitle] = [];
    courseGroups[s.courseTitle].push(s);
  }

  const total = students.length;
  const completed = students.filter((s) => s.progressStatus === "COMPLETED").length;
  const avgProgress = total > 0 ? Math.round(students.reduce((sum, c) => sum + c.progress, 0) / total) : 0;

  return (
    <AppShell role="instructor">
      <PageHeader title="Слушатели курсов" description="Все слушатели, зачисленные на ваши курсы." />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div><p className="text-2xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Слушателей</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <div><p className="text-2xl font-bold">{completed}</p><p className="text-xs text-muted-foreground">Завершили</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <div><p className="text-2xl font-bold">{avgProgress}%</p><p className="text-xs text-muted-foreground">Средний прогресс</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            <div><p className="text-2xl font-bold">{total - completed}</p><p className="text-xs text-muted-foreground">В процессе</p></div>
          </CardContent>
        </Card>
      </div>

      {Object.keys(courseGroups).length > 0 && (
        <Card className="rounded-2xl mb-6">
          <CardContent className="p-5">
            <BarChart
              items={Object.entries(courseGroups).map(([course, list]) => ({
                label: course.length > 30 ? course.slice(0, 30) + "…" : course,
                value: Math.round(list.reduce((sum, st) => sum + st.progress, 0) / list.length),
                sublabel: `${list.filter((st) => st.progressStatus === "COMPLETED").length}/${list.length} завершили`,
                color: list.reduce((sum, st) => sum + st.progress, 0) / list.length > 75 ? "#16a34a" : "#ca8a04",
              }))}
            />
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Слушатель</TableHead>
                <TableHead>Курс</TableHead>
                <TableHead>Поток</TableHead>
                <TableHead>Прогресс</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Последний вход</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Нет слушателей на ваших курсах.</TableCell></TableRow>
              ) : students.map((s) => (
                <TableRow key={`${s.id}-${s.courseTitle}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar name={s.name} className="h-7 w-7 text-[10px]" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.courseTitle}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.cohortName ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${s.progress}%` }} />
                      </div>
                      <span className="text-xs tabular-nums">{s.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      s.progressStatus === "COMPLETED" ? "bg-emerald-50 text-emerald-700" :
                      s.progressStatus === "IN_PROGRESS" ? "bg-blue-50 text-blue-700" :
                      s.progressStatus === "BLOCKED" ? "bg-red-50 text-red-700" :
                      "bg-gray-50 text-gray-500"
                    }>
                      {s.progressStatus === "COMPLETED" ? "Завершил" :
                       s.progressStatus === "IN_PROGRESS" ? "В процессе" :
                       s.progressStatus === "BLOCKED" ? "Заблокирован" : "Не начат"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString("ru") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
