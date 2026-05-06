import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Plus, Download } from "lucide-react";
import { MOCK_COHORTS } from "@/lib/mock-data";

const MOCK_ENROLLMENTS = [
  { id: "e1", studentName: "Слушатель 1", email: "student1@academy.local", course: "AI Strategy Fundamentals", cohort: "Поток Q2-2026", status: "ACTIVE" as const, enrolledAt: "2026-04-15" },
  { id: "e2", studentName: "Слушатель 2", email: "student2@academy.local", course: "AI Strategy Fundamentals", cohort: "Поток Q2-2026", status: "ACTIVE" as const, enrolledAt: "2026-04-15" },
  { id: "e3", studentName: "Слушатель 3", email: "student3@academy.local", course: "Prompt Engineering for Leaders", cohort: "Поток Весна-2026", status: "ACTIVE" as const, enrolledAt: "2026-03-01" },
  { id: "e4", studentName: "Слушатель 4", email: "student4@academy.local", course: "Prompt Engineering for Leaders", cohort: "Поток Весна-2026", status: "PAUSED" as const, enrolledAt: "2026-03-01" },
  { id: "e5", studentName: "Слушатель 5", email: "student5@academy.local", course: "AI Strategy Fundamentals", cohort: "Поток Q1-2026", status: "COMPLETED" as const, enrolledAt: "2026-01-10" },
];

const STATUS_BADGE = {
  ACTIVE: { className: "border-emerald-200 bg-emerald-50 text-emerald-700", label: "Активен" },
  PAUSED: { className: "border-amber-200 bg-amber-50 text-amber-700", label: "Приостановлен" },
  COMPLETED: { className: "border-sky-200 bg-sky-50 text-sky-700", label: "Завершён" },
  CANCELLED: { className: "border-rose-200 bg-rose-50 text-rose-700", label: "Отменён" },
  INVITED: { className: "border-gray-200 bg-gray-50 text-gray-600", label: "Приглашён" },
};

export default function AdminEnrollmentsPage() {
  return (
    <AppShell role="admin">
      <PageHeader title="Зачисления" description="Управление доступом слушателей к курсам и потокам." badge="Администратор" />
      <div className="space-y-6">
        <div className="flex gap-3">
          <Button><Plus className="h-4 w-4" />Зачислить слушателя</Button>
          <Button variant="secondary"><Download className="h-4 w-4" />Экспорт CSV</Button>
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
            {MOCK_ENROLLMENTS.map((e) => {
              const badge = STATUS_BADGE[e.status] ?? STATUS_BADGE.ACTIVE;
              return (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar name={e.studentName} className="h-7 w-7 text-[10px]" />
                      <div>
                        <p className="text-sm font-medium">{e.studentName}</p>
                        <p className="text-xs text-muted-foreground">{e.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{e.course}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.cohort}</TableCell>
                  <TableCell><Badge className={badge.className}>{badge.label}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.enrolledAt}</TableCell>
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
