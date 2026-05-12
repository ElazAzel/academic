import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Award, Download, ExternalLink } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { listCertificates } from "@/server/modules/certificates/service";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudentCertificatesPage() {
 const user = await requireRolePage(["student"]);
 const certificates = await listCertificates(user.id);

 return (
  <AppShell role="student">
   <PageHeader title="Мои сертификаты" description="Выданные сертификаты о прохождении курсов."/>
   {certificates.length > 0 ? (
    <Table className="mt-6">
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
          <Button size="sm" variant="secondary" asChild>
           <Link href={`/api/v1/certificates/${cert.id}/pdf`} target="_blank">
            <Download className="h-3.5 w-3.5 mr-1"/> PDF
           </Link>
          </Button>
          <Button size="sm" variant="secondary" asChild>
           <Link href={cert.verificationUrl} target="_blank">
            <ExternalLink className="h-3.5 w-3.5 mr-1"/> Проверить
           </Link>
          </Button>
         </div>
        </TableCell>
       </TableRow>
      ))}
     </TableBody>
    </Table>
   ) : (
    <Card className="mt-6">
     <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
      <Award className="h-10 w-10 text-muted-foreground/40"/>
      <p className="text-muted-foreground">Сертификатов пока нет. Завершите курс, чтобы получить сертификат.</p>
     </CardContent>
    </Card>
   )}
  </AppShell>
 );
}
