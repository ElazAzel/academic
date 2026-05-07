import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Plus, Download } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { listEnrollments } from "@/server/modules/courses/service";

export const dynamic = "force-dynamic";

const STATUS_BADGE = {
  ACTIVE: { className: "border-emerald-200 bg-emerald-50 text-emerald-700", label: "Активен" },
  PAUSED: { className: "border-amber-200 bg-amber-50 text-amber-700", label: "Приостановлен" },
  COMPLETED: { className: "border-sky-200 bg-sky-50 text-sky-700", label: "Завершён" },
  CANCELLED: { className: "border-rose-200 bg-rose-50 text-rose-700", label: "Отменён" },
  INVITED: { className: "border-gray-200 bg-gray-50 text-gray-600", label: "Приглашён" },
};

export default async function AdminEnrollmentsPage() {
  await requireRolePage(["admin"]);
  const enrollments = await listEnrollments();

  return (
    <AppShell role="admin">
      <PageHeader title="Зачисления" description="Управление доступом слушателей к курсам и потокам." badge="Администратор" />
      <div className="space-y-6 mt-6">
        <div className="flex gap-3">
          <Button><Plus className="h-4 w-4 mr-2" />Зачислить слушателя</Button>
          <Button variant="secondary"><Download className="h-4 w-4 mr-2" />Экспорт CSV</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Слушатель</TableHead>
              <TableHead>Курс</TableHead>
              <TableHead>Поток</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((e) => {
              const badge = STATUS_BADGE[e.status as keyof typeof STATUS_BADGE] ?? STATUS_BADGE.ACTIVE;
              return (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar name={e.user.name ?? e.user.email} className="h-7 w-7 text-[10px]" />
                      <div>
                        <p className="text-sm font-medium">{e.user.name ?? e.user.email}</p>
                        <p className="text-xs text-muted-foreground">{e.user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{e.course.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.cohort?.name ?? "Без потока"}</TableCell>
                  <TableCell><Badge className={badge.className}>{badge.label}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.createdAt.toLocaleDateString("ru-RU")}</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="secondary">Управление</Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
