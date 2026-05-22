import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { EmptyState } from "@/components/lms/empty-state";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Award, Download, ExternalLink } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { listCertificates } from "@/server/modules/certificates/service";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudentCertificatesPage() {
 const user = await requireRolePage(["student"]);
 const certificates = await listCertificates({ userId: user.id });

 return (
  <AppShell role="student">
   <PageHeader title="Мои сертификаты" description="Выданные сертификаты о прохождении курсов."/>
    {certificates.length > 0 ? (
     <div className="overflow-x-auto mt-6">
     <Table>
     <TableHeader>
      <TableRow>
       <TableHead>Номер</TableHead>
       <TableHead>Курс</TableHead>
       <TableHead>Дата выдачи</TableHead>
       <TableHead className="text-right">Действия</TableHead>
      </TableRow>
     </TableHeader>
     <TableBody>
      {certificates.map((cert) => (
       <TableRow key={cert.id}>
        <TableCell>
         <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500"/>
          <code className="rounded bg-muted px-2 py-0.5 text-xs">{cert.number}</code>
         </div>
        </TableCell>
        <TableCell className="text-sm font-medium">{cert.course.title}</TableCell>
        <TableCell className="text-xs text-muted-foreground">
         {new Date(cert.issuedAt).toLocaleDateString("ru-RU")}
        </TableCell>
        <TableCell className="text-right">
         <div className="flex gap-1 justify-end">
           <Button size="sm" variant="secondary" asChild aria-label="Скачать сертификат в PDF">
            <Link href={`/api/v1/certificates/${cert.id}/pdf`} target="_blank">
             <Download className="h-3.5 w-3.5 mr-1"/> PDF
            </Link>
           </Button>
           <Button size="sm" variant="secondary" asChild aria-label="Проверить сертификат онлайн">
            <Link href={`/certificates/verify/${cert.verificationCode}`} target="_blank">
             <ExternalLink className="h-3.5 w-3.5 mr-1"/> Проверить
            </Link>
           </Button>
         </div>
        </TableCell>
       </TableRow>
      ))}
     </TableBody>
      </Table>
     </div>
    ) : (
    <div className="mt-6">
     <EmptyState
      icon={Award}
      title="Сертификатов пока нет"
      description="Завершите курс, чтобы получить сертификат."
     />
    </div>
   )}
  </AppShell>
 );
}
