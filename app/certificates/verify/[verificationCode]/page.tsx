import Link from "next/link";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyCertificateByCode } from "@/server/modules/certificates/service";

export const metadata = {
  title: "Проверка сертификата",
  description: "Проверка подлинности сертификата AI Strategic Academy.",
};


export const revalidate = 3600;

export default async function CertificateVerificationPage({
  params
}: {
  params: Promise<{ verificationCode: string }>;
}) {
  const { verificationCode } = await params;
  const certificate = await verifyCertificateByCode(verificationCode);
  const valid = certificate?.valid === true;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-3xl flex-col px-4 py-12 sm:px-6">
        <Card className="overflow-hidden">
          <CardHeader className={valid ? "bg-emerald-50" : "bg-red-50"}>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
              {valid ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-700" aria-hidden />
              ) : (
                <ShieldAlert className="h-7 w-7 text-red-700" aria-hidden />
              )}
            </div>
            <Badge className={valid ? "w-fit border-emerald-200 bg-white text-emerald-700" : "w-fit border-red-200 bg-white text-red-700"}>
              {valid ? "Сертификат подтверждён" : "Сертификат не подтверждён"}
            </Badge>
            <CardTitle className="text-3xl">
              {valid ? "Проверка прошла успешно" : "Проверка не найдена или сертификат отозван"}
            </CardTitle>
            <CardDescription>
              Страница показывает только публичные данные сертификата и не раскрывает email или внутренние данные слушателя.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            {certificate ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border bg-white p-4">
                  <dt className="text-xs uppercase text-muted-foreground">Номер</dt>
                  <dd className="mt-1 font-medium">{certificate.number}</dd>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <dt className="text-xs uppercase text-muted-foreground">Дата выдачи</dt>
                  <dd className="mt-1 font-medium">{certificate.issuedAt.toISOString().slice(0, 10)}</dd>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <dt className="text-xs uppercase text-muted-foreground">Слушатель</dt>
                  <dd className="mt-1 font-medium">{certificate.studentName}</dd>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <dt className="text-xs uppercase text-muted-foreground">Курс</dt>
                  <dd className="mt-1 font-medium">{certificate.courseTitle}</dd>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <dt className="text-xs uppercase text-muted-foreground">Часы</dt>
                  <dd className="mt-1 font-medium">{certificate.durationHours}</dd>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <dt className="text-xs uppercase text-muted-foreground">Статус</dt>
                  <dd className="mt-1 font-medium">{certificate.revokedAt ? "Отозван" : "Действителен"}</dd>
                </div>
              </dl>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/40 p-5 text-sm text-muted-foreground">
                Код проверки не найден. Проверьте ссылку или запросите у академии актуальный QR-код.
              </div>
            )}
            <Button asChild variant="secondary">
              <Link href="/">Вернуться на главную</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

