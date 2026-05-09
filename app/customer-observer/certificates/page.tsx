import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRolePage } from "@/lib/auth/page-guards";
import { MOCK_CERTIFICATES } from "@/lib/mock-data";

export default async function CustomerObserverCertificatesPage() {
  await requireRolePage(["customer_observer"]);

  return (
    <AppShell role="customer_observer">
      <PageHeader
        title="Сертификаты"
        description="Список выданных сертификатов по проекту и курсам, доступным заказчику."
        badge="Заказчик"
      />
      <Card className="mt-6">
        <CardContent className="py-4">
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
              {MOCK_CERTIFICATES.map((certificate) => (
                <TableRow key={certificate.id}>
                  <TableCell>
                    <Badge>{certificate.number}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{certificate.studentName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{certificate.courseTitle}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(certificate.issuedAt).toLocaleDateString("ru-RU")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
