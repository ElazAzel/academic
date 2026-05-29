import Link from "next/link";
import { Award, Download, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { EmptyState } from "@/components/lms/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRolePage } from "@/lib/auth/page-guards";
import { listCertificates } from "@/server/modules/certificates/service";

export const metadata = {
  title: "Сертификаты — Студент",
  description: "Мои сертификаты.",
};

export const dynamic = "force-dynamic";

function formatIssuedAt(date: Date) {
  return new Date(date).toLocaleDateString("ru-RU");
}

export default async function StudentCertificatesPage() {
  const user = await requireRolePage(["student"]);
  const certificates = await listCertificates({ userId: user.id });

  return (
    <AppShell role="student">
      <PageHeader title="Мои сертификаты" description="Выданные сертификаты о прохождении курсов." />

      {certificates.length > 0 ? (
        <>
          <div className="mt-6 grid gap-3 md:hidden">
            {certificates.map((cert) => (
              <Card key={cert.id}>
                <CardContent className="space-y-4 pt-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <Award className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="break-words text-body-md font-body-md font-semibold text-m3-on-surface">
                        {cert.course.title}
                      </p>
                      <code className="inline-block max-w-full break-all rounded bg-muted px-2 py-1 text-xs text-m3-on-surface-variant">
                        {cert.number}
                      </code>
                    </div>
                  </div>

                  <div className="rounded-lg bg-m3-surface-container-low px-3 py-2">
                    <p className="text-label-sm font-label-sm text-m3-on-surface-variant">Дата выдачи</p>
                    <p className="text-body-sm font-body-sm text-m3-on-surface">{formatIssuedAt(cert.issuedAt)}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button size="sm" variant="secondary" asChild className="w-full whitespace-nowrap" aria-label="Скачать сертификат в PDF">
                      <Link href={`/api/v1/certificates/${cert.id}/pdf`} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        PDF
                      </Link>
                    </Button>
                    <Button size="sm" variant="secondary" asChild className="w-full whitespace-nowrap" aria-label="Проверить сертификат онлайн">
                      <Link href={`/certificates/verify/${cert.verificationCode}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        Проверить
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 hidden overflow-x-auto md:block">
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
                        <Award className="h-4 w-4 text-amber-500" aria-hidden="true" />
                        <code className="rounded bg-muted px-2 py-0.5 text-xs">{cert.number}</code>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{cert.course.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatIssuedAt(cert.issuedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex min-w-max justify-end gap-2">
                        <Button size="sm" variant="secondary" asChild className="whitespace-nowrap" aria-label="Скачать сертификат в PDF">
                          <Link href={`/api/v1/certificates/${cert.id}/pdf`} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            PDF
                          </Link>
                        </Button>
                        <Button size="sm" variant="secondary" asChild className="whitespace-nowrap" aria-label="Проверить сертификат онлайн">
                          <Link href={`/certificates/verify/${cert.verificationCode}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            Проверить
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
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
