import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { UserPlus, Users2, GraduationCap } from "lucide-react";
import Link from "next/link";

const prisma = getPrisma();
export const dynamic = "force-dynamic";

export default async function AdminManagementPage() {
  await requireRolePage(["admin"]);

  const [users, cohorts, enrollments] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, name: true, email: true, status: true, createdAt: true,
        roles: { select: { role: { select: { key: true } } } },
        enrollments: { select: { id: true, course: { select: { title: true } }, status: true, cohort: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.cohort.findMany({
      select: { id: true, name: true, status: true, _count: { select: { enrollments: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.enrollment.count({ where: { status: "ACTIVE" } }),
  ]);

  const totalEnrollments = enrollments;

  return (
    <AppShell role="admin">
      <PageHeader
        title="Управление платформой"
        description="Пользователи, потоки и зачисления в одном месте."
      >
        <div className="flex gap-2 mt-4">
          <Button asChild size="sm">
            <Link href="/admin/users">
              <UserPlus className="h-4 w-4 mr-1" />
              Создать пользователя
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/admin/enrollments">
              <GraduationCap className="h-4 w-4 mr-1" />
              Зачислить на курс
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/admin/cohorts">
              <Users2 className="h-4 w-4 mr-1" />
              Потоки
            </Link>
          </Button>
        </div>
      </PageHeader>

      <div className="mt-6 grid gap-4 md:grid-cols-3 mb-6">
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-xs text-muted-foreground">Пользователей</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Users2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{cohorts.length}</p>
              <p className="text-xs text-muted-foreground">Потоков</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <GraduationCap className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalEnrollments}</p>
              <p className="text-xs text-muted-foreground">Активных зачислений</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Пользователи и их зачисления</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Роли</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Зачисления</TableHead>
                  <TableHead>Поток</TableHead>
                  <TableHead>Дата регистрации</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{u.name || "Без имени"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r.role.key} className="text-[10px] capitalize">
                            {r.role.key === "super_curator" ? "супер-куратор" : r.role.key}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={u.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}>
                        {u.status === "ACTIVE" ? "Активен" : u.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {u.enrollments.length > 0 ? u.enrollments.map((e) => (
                          <div key={e.id} className="flex items-center gap-1 text-xs">
                            <Badge className={`text-[10px] ${e.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : e.status === "COMPLETED" ? "bg-sky-100 text-sky-700" : "bg-gray-100 text-gray-600"}`}>
                              {e.status === "ACTIVE" ? "Активен" : e.status === "COMPLETED" ? "Завершён" : e.status}
                            </Badge>
                            <span className="truncate max-w-[150px]">{e.course.title}</span>
                          </div>
                        )) : <span className="text-xs text-muted-foreground">Нет зачислений</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.enrollments.filter(e => e.cohort).map(e => e.cohort!.name).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.createdAt.toLocaleDateString("ru-RU")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
