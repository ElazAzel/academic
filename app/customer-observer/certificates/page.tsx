import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRolePage } from "@/lib/auth/page-guards";
import { listCertificates } from "@/server/modules/certificates/service";
import { getScopedStudentIdsForObserver } from "@/server/modules/observer/scope";

export const dynamic = "force-dynamic";

export default async function CustomerObserverCertificatesPage() {
 const user = await requireRolePage(["customer_observer"]);
 const scopedIds = await getScopedStudentIdsForObserver(user.id);
 const certificates = await listCertificates({ userIds: scopedIds ?? [] });

 return (
  <AppShell role="customer_observer">
   <PageHeader
    title="Сертификаты"
    description="Список выданных сертификатов по проекту и курсам, доступным заказчику."
  />
   <Card className="mt-6">
    <CardContent className="py-4">
     {certificates.length > 0 ? (
      <Table>
       <TableHeader>
        <TableRow>
         <TableHead>Номер</TableHead>
         <TableHead>Слушатель</TableHead>
         <TableHead>Курс</TableHead>
         <TableHead>Дата</TableHead>
        </TableRow>
       </TableHeader>
       <TableBody>
        {certificates.map((certificate) => (
         <TableRow key={certificate.id}>
          <TableCell>
           <Badge>{certificate.number}</Badge>
          </TableCell>
          <TableCell className="text-sm">{certificate.user.name ?? certificate.user.email}</TableCell>
          <TableCell className="text-sm text-muted-foreground">{certificate.course.title}</TableCell>
          <TableCell className="text-xs text-muted-foreground">
           {new Date(certificate.issuedAt).toLocaleDateString("ru-RU")}
          </TableCell>
         </TableRow>
        ))}
       </TableBody>
      </Table>
     ) : (
      <p className="py-10 text-center text-sm text-muted-foreground">Сертификаты пока не выданы.</p>
     )}
    </CardContent>
   </Card>
  </AppShell>
 );
}
