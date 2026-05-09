import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Filter, Search } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ACTION_COLORS: Record<string, string> = {
  "user.login": "border-sky-200 bg-sky-50 text-sky-700",
  "course.published": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "enrollment.created": "border-amber-200 bg-amber-50 text-amber-700",
  "invite.created": "border-violet-200 bg-violet-50 text-violet-700",
  "assignment.reviewed": "border-primary/20 bg-primary/5 text-primary",
  "course.created": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "course.updated": "border-amber-200 bg-amber-50 text-amber-700",
};

export default async function AdminAuditLogsPage() {
  await requireRolePage(["admin"]);
  const prisma = getPrisma();

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { name: true, email: true } } }
  });

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
            {logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <Badge className={ACTION_COLORS[l.action] ?? "border-gray-200 bg-gray-50 text-gray-600"}>
                    {l.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{l.actor?.name ?? l.actor?.email ?? "Система"}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{l.entity}/{l.entityId}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{l.createdAt.toLocaleString("ru-RU")}</TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">{l.ipAddress ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
