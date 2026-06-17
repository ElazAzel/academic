import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRolePage } from "@/lib/auth/page-guards";
import {
  getCommercialReadinessData,
  type ReadinessStatus,
} from "@/server/modules/commercial-readiness/service";

export const metadata = {
  title: "Готовность к внедрению — Администрирование",
  description: "Центр подготовки платформы к B2B, корпоративному обучению, квазигосударственным и тендерным внедрениям.",
};

export const dynamic = "force-dynamic";

const statusLabels: Record<ReadinessStatus, string> = {
  ready: "Готово",
  partial: "Частично",
  blocked: "Блокер",
};

const statusVariants: Record<ReadinessStatus, "default" | "secondary" | "destructive"> = {
  ready: "default",
  partial: "secondary",
  blocked: "destructive",
};

const statusTone: Record<ReadinessStatus, string> = {
  ready: "text-emerald-700",
  partial: "text-amber-700",
  blocked: "text-m3-error",
};

export default async function AdminReadinessPage() {
  await requireRolePage(["admin"]);
  const data = await getCommercialReadinessData();
  const readyCount = data.evidencePack.filter((item) => item.status === "ready").length;
  const blockedCount = data.evidencePack.filter((item) => item.status === "blocked").length;
  const avgScore = Math.round(data.segments.reduce((sum, item) => sum + item.score, 0) / data.segments.length);

  return (
    <AppShell role="admin">
      <PageHeader
        title="Готовность к внедрению"
        description="Единый центр для B2B-демо, корпоративного обучения, квазигосударственных пилотов и предтендерной подготовки."
      >
        <Button asChild variant="secondary">
          <Link href="/admin/reports">
            <Icon name="bar_chart" size={18} />
            Отчеты
          </Link>
        </Button>
        <Button asChild>
          <Link href="/customer-observer">
            <Icon name="visibility" size={18} />
            Кабинет заказчика
          </Link>
        </Button>
      </PageHeader>

      <div className="space-y-6">
        <Card className="border-m3-primary/20 bg-gradient-to-br from-m3-primary-fixed/35 via-m3-surface-container-lowest to-m3-tertiary-container/20 shadow-m3-soft">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <Badge variant="outline" className="mb-3">Срез на {data.generatedAt}</Badge>
                <CardTitle className="max-w-4xl text-headline-md font-headline-md text-m3-on-surface">
                  {data.summary.headline}
                </CardTitle>
                <CardDescription className="mt-3 max-w-4xl text-body-md leading-relaxed">
                  {data.summary.description}
                </CardDescription>
              </div>
              <div className="grid min-w-[220px] grid-cols-3 gap-2 md:grid-cols-1">
                <SummaryStat label="Соответствие" value={`${avgScore}%`} />
                <SummaryStat label="Готово" value={`${readyCount}`} />
                <SummaryStat label="Блокеры" value={`${blockedCount}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-m3-outline-variant/50 bg-m3-surface-container-lowest/75 p-4 text-body-md leading-relaxed text-m3-on-surface">
              {data.summary.verdict}
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 lg:grid-cols-4" aria-label="Готовность по сегментам">
          {data.segments.map((segment) => (
            <Card key={segment.title} className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-title-md font-title-md">{segment.title}</CardTitle>
                  <Badge variant={statusVariants[segment.status]}>{statusLabels[segment.status]}</Badge>
                </div>
                <div className="pt-2">
                  <div className="mb-2 flex items-center justify-between text-label-sm font-label-sm text-m3-on-surface-variant">
                    <span>Привлекательность</span>
                    <span>{segment.score}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-m3-surface-container-high">
                    <div className="h-full rounded-full bg-gradient-to-r from-m3-tertiary to-m3-primary" style={{ width: `${segment.score}%` }} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-body-sm leading-relaxed">
                <ReadinessText label="Потребность" value={segment.buyerNeed} />
                <ReadinessText label="Соответствие" value={segment.platformFit} />
                <ReadinessText label="Разрыв" value={segment.blocker} tone={statusTone[segment.status]} />
                <ReadinessText label="Следующий шаг" value={segment.nextStep} />
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardHeader>
            <CardTitle>Пакет доказательств для заказчика</CardTitle>
            <CardDescription>
              Что показывать на демо и что нужно закрыть перед крупным B2B, квазигосударственным или тендерным разбором.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Блок</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Зачем заказчику</TableHead>
                  <TableHead>Доказательство</TableHead>
                  <TableHead>Разрыв</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.evidencePack.map((item) => (
                  <TableRow key={item.title}>
                    <TableCell label="Блок" className="font-medium">{item.title}</TableCell>
                    <TableCell label="Статус">
                      <Badge variant={statusVariants[item.status]}>{statusLabels[item.status]}</Badge>
                    </TableCell>
                    <TableCell label="Зачем заказчику">{item.purpose}</TableCell>
                    <TableCell label="Доказательство">{item.evidence}</TableCell>
                    <TableCell label="Разрыв" className={statusTone[item.status]}>{item.gap}</TableCell>
                    <TableCell label="Действия">
                      <div className="flex flex-wrap gap-2">
                        {item.links.map((link) => (
                          <Button key={link.href} asChild size="sm" variant="secondary">
                            <Link href={link.href}>{link.label}</Link>
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardHeader>
            <CardTitle>Госготовность и тендерные блокеры</CardTitle>
            <CardDescription>
              Предварительная карта для РК: какие зоны нужно доказать до формального промышленного контура.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {data.govReadiness.map((item) => (
                <div key={item.area} className="rounded-xl border border-m3-outline-variant/60 bg-m3-surface-container-low p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="text-title-sm font-title-sm text-m3-on-surface">{item.area}</h3>
                    <Badge variant={statusVariants[item.status]}>{statusLabels[item.status]}</Badge>
                  </div>
                  <div className="space-y-2 text-body-sm leading-relaxed">
                    <ReadinessText label="Текущее соответствие" value={item.currentFit} />
                    <ReadinessText label="Блокер" value={item.blocker} tone={statusTone[item.status]} />
                    <ReadinessText label="Действие" value={item.action} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardHeader>
            <CardTitle>Дорожная карта до тендерной готовности</CardTitle>
            <CardDescription>
              Практический порядок работ: от коммерческого пилота к формальному предтендерному пакету.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-4">
              {data.roadmap.map((step) => (
                <div key={step.horizon} className="rounded-xl border border-m3-outline-variant/60 bg-m3-surface-container-low p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Icon name="event" size={20} className="text-m3-primary" />
                    <h3 className="text-title-sm font-title-sm">{step.horizon}</h3>
                  </div>
                  <ul className="space-y-2 text-body-sm leading-relaxed text-m3-on-surface">
                    {step.actions.map((action) => (
                      <li key={action} className="flex gap-2">
                        <Icon name="check_circle" size={18} className="mt-0.5 shrink-0 text-m3-tertiary" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 rounded-lg bg-m3-surface-container-high p-3 text-body-sm font-medium text-m3-on-surface">
                    {step.outcome}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-m3-outline-variant/60 bg-m3-surface-container-lowest/80 p-3">
      <p className="text-label-sm font-label-sm text-m3-on-surface-variant">{label}</p>
      <p className="mt-1 text-headline-sm font-headline-sm text-m3-primary">{value}</p>
    </div>
  );
}

function ReadinessText({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <p className="text-m3-on-surface">
      <span className="font-semibold text-m3-on-surface">{label}: </span>
      <span className={tone}>{value}</span>
    </p>
  );
}
