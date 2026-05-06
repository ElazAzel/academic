import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Filter, Search } from "lucide-react";

const MOCK_LOGS = [
  { id: "a1", action: "user.login", actor: "admin@academy.local", entity: "user", time: "2026-05-07 01:15:22", ip: "192.168.1.1" },
  { id: "a2", action: "course.published", actor: "instructor1@academy.local", entity: "course/AI Strategy Fundamentals", time: "2026-05-06 18:30:10", ip: "10.0.0.5" },
  { id: "a3", action: "enrollment.created", actor: "admin@academy.local", entity: "enrollment/student1→AI Strategy", time: "2026-05-06 14:22:05", ip: "192.168.1.1" },
  { id: "a4", action: "invite.created", actor: "admin@academy.local", entity: "invite/INV-2026-001", time: "2026-05-06 12:00:00", ip: "192.168.1.1" },
  { id: "a5", action: "assignment.reviewed", actor: "curator@academy.local", entity: "submission/s-sub1", time: "2026-05-05 20:15:00", ip: "10.0.0.12" },
  { id: "a6", action: "progress.lesson_marked", actor: "student2@academy.local", entity: "lesson/Unit-экономика AI", time: "2026-05-05 16:40:00", ip: "172.16.0.55" },
  { id: "a7", action: "user.password_changed", actor: "student3@academy.local", entity: "user/student3", time: "2026-05-04 10:10:00", ip: "172.16.0.60" },
];

const ACTION_COLORS: Record<string, string> = {
  "user.login": "border-sky-200 bg-sky-50 text-sky-700",
  "course.published": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "enrollment.created": "border-amber-200 bg-amber-50 text-amber-700",
  "invite.created": "border-violet-200 bg-violet-50 text-violet-700",
  "assignment.reviewed": "border-primary/20 bg-primary/5 text-primary",
};

export default function AdminAuditLogsPage() {
  return (
    <AppShell role="admin">
      <PageHeader title="Журнал действий" description="Аудит действий администраторов, кураторов и пользователей." badge="Администратор" />
      <div className="space-y-6">
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className="w-full rounded-xl border bg-background pl-9 pr-3 py-2 text-sm" placeholder="Поиск по действию или актору..." />
          </div>
          <Button variant="secondary"><Filter className="h-4 w-4" />Фильтры</Button>
          <Button variant="secondary"><Download className="h-4 w-4" />Экспорт</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Действие</TableHead>
              <TableHead>Актор</TableHead>
              <TableHead>Объект</TableHead>
              <TableHead>Время</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_LOGS.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <Badge className={ACTION_COLORS[l.action] ?? "border-gray-200 bg-gray-50 text-gray-600"}>
                    {l.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{l.actor}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{l.entity}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{l.time}</TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">{l.ip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
