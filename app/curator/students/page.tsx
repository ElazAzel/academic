import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const MOCK_STUDENTS = [
  { id: "s1", name: "Слушатель 1", email: "student1@academy.local", course: "AI Strategy Fundamentals", progress: 45, risk: false },
  { id: "s2", name: "Слушатель 2", email: "student2@academy.local", course: "AI Strategy Fundamentals", progress: 80, risk: false },
  { id: "s3", name: "Слушатель 3", email: "student3@academy.local", course: "Prompt Engineering for Leaders", progress: 18, risk: false },
  { id: "s4", name: "Слушатель 4", email: "student4@academy.local", course: "Prompt Engineering for Leaders", progress: 10, risk: true },
  { id: "s5", name: "Слушатель 5", email: "student5@academy.local", course: "AI Strategy Fundamentals", progress: 62, risk: false },
  { id: "s6", name: "Слушатель 6", email: "student6@academy.local", course: "AI Strategy Fundamentals", progress: 5, risk: true },
  { id: "s7", name: "Слушатель 7", email: "student7@academy.local", course: "AI Strategy Fundamentals", progress: 0, risk: true },
];

export default function CuratorStudentsPage() {
  return (
    <AppShell role="curator">
      <PageHeader title="Мои слушатели" description="Полный список ваших слушателей с прогрессом и статусом." badge="Куратор" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Слушатель</TableHead>
            <TableHead>Курс</TableHead>
            <TableHead>Прогресс</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="text-right">Действие</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MOCK_STUDENTS.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar name={s.name} className="h-7 w-7 text-[10px]" />
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{s.course}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Progress value={s.progress} className="h-1.5 flex-1" />
                  <span className="text-xs font-medium w-8 text-right">{s.progress}%</span>
                </div>
              </TableCell>
              <TableCell>
                {s.risk ? (
                  <Badge className="border-rose-200 bg-rose-50 text-rose-700">Риск</Badge>
                ) : s.progress >= 80 ? (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Отлично</Badge>
                ) : (
                  <Badge className="border-sky-200 bg-sky-50 text-sky-700">Активен</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="secondary">Подробнее</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AppShell>
  );
}
