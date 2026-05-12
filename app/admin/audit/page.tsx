import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRolePage } from "@/lib/auth/page-guards";
import { listAuditLogs } from "@/server/modules/audit/service";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage(props: { searchParams?: Promise<{ page?: string; limit?: string }> }) {
 await requireRolePage(["admin"]);
 const sp = await props.searchParams;
 const page = Math.max(1, parseInt(sp?.page ?? "1", 10));
 const limit = Math.min(100, Math.max(1, parseInt(sp?.limit ?? "25", 10)));
 const { logs, total, pages } = await listAuditLogs(page, limit);

 return (
  <AppShell role="admin">
   <PageHeader 
    title="Логи аудита" 
    description="История всех административных действий на платформе." 
  />

   <div className="mt-6 space-y-4">
    <Card className="rounded-3xl border-2 overflow-hidden">
     <CardContent className="p-0">
      <Table>
       <TableHeader className="bg-muted/50">
        <TableRow>
         <TableHead className="w-[180px]">Дата</TableHead>
         <TableHead>Действие</TableHead>
         <TableHead>Кто</TableHead>
         <TableHead>Объект</TableHead>
         <TableHead className="text-right">ID Объекта</TableHead>
        </TableRow>
       </TableHeader>
       <TableBody>
        {logs.length > 0 && logs.map((log) => (
         <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
           {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ru })}
          </TableCell>
          <TableCell className="font-medium text-sm">
           <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-primary"/>
            {log.action}
           </div>
          </TableCell>
          <TableCell className="text-sm">
           {log.actor ? (
            <div>
             <p>{log.actor.name || "Без имени"}</p>
             <p className="text-[10px] text-muted-foreground">{log.actor.email}</p>
            </div>
           ) : (
            <span className="text-muted-foreground">Система / Гость</span>
           )}
          </TableCell>
          <TableCell className="text-sm">
           <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold uppercase">
            {log.entity}
           </span>
          </TableCell>
          <TableCell className="text-right font-mono text-[10px] text-muted-foreground">
           {log.entityId || "—"}
          </TableCell>
         </TableRow>
        ))}
        {logs.length === 0 && (
         <TableRow>
          <TableCell colSpan={5} className="py-20 text-center text-muted-foreground">
           Логов пока нет.
          </TableCell>
         </TableRow>
        )}
       </TableBody>
      </Table>
     </CardContent>
    </Card>

    {/* Pagination */}
    {pages > 1 && (
     <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
       Показано {logs.length} из {total} записей · Страница {page} из {pages}
      </p>
      <div className="flex items-center gap-2">
       {page > 1 && (
        <Button size="sm" variant="secondary" asChild>
          <Link href={`/admin/audit?page=${page - 1}&limit=${limit}`}>
           <ChevronLeft className="h-4 w-4 mr-1" />
           Назад
          </Link>
         </Button>
       )}
       {page < pages && (
        <Button size="sm" variant="secondary" asChild>
          <Link href={`/admin/audit?page=${page + 1}&limit=${limit}`}>
           Вперед
           <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
         </Button>
       )}
      </div>
     </div>
    )}
   </div>
  </AppShell>
 );
}
