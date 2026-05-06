import { AppShell } from "@/components/layout/app-shell";
import { MetricGrid, CourseManageGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Plus, Download, FileText, Link2, Users } from "lucide-react";
import {
  getAdminMetrics,
  MOCK_COURSES,
  MOCK_COHORTS,
  MOCK_CERTIFICATES,
  MOCK_INVITES,
} from "@/lib/mock-data";

export default function AdminDashboardPage() {
  const metrics = getAdminMetrics();

  return (
    <AppShell role="admin">
      <PageHeader
        title="Админ-дашборд"
        description="Операционное состояние академии: курсы, потоки, пользователи, аудит и инвайты."
        badge="Администратор"
      />
      <div className="space-y-6">
        <MetricGrid metrics={metrics} />

        <div className="flex gap-3">
          <Button>
            <Plus className="h-4 w-4" aria-hidden />
            Создать курс
          </Button>
          <Button variant="secondary">
            <Link2 className="h-4 w-4" aria-hidden />
            Создать инвайт
          </Button>
          <Button variant="secondary">
            <Users className="h-4 w-4" aria-hidden />
            Импорт пользователей
          </Button>
          <Button variant="secondary">
            <Download className="h-4 w-4" aria-hidden />
            Экспорт отчёта
          </Button>
        </div>

        <Tabs
          tabs={[
            {
              label: "Курсы",
              content: <CourseManageGrid courses={MOCK_COURSES} />,
            },
            {
              label: "Потоки",
              content: (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Курс</TableHead>
                      <TableHead className="text-center">Слушатели</TableHead>
                      <TableHead>Период</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_COHORTS.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">{c.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.courseTitle}</TableCell>
                        <TableCell className="text-center text-sm">{c.studentsCount}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.startsAt} — {c.endsAt}
                        </TableCell>
                        <TableCell>
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                            {c.status === "active" ? "Активен" : "Завершён"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ),
            },
            {
              label: "Инвайты",
              content: (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Токен</TableHead>
                      <TableHead>Курс</TableHead>
                      <TableHead>Поток</TableHead>
                      <TableHead className="text-center">Использовано</TableHead>
                      <TableHead>Срок действия</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_INVITES.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <code className="rounded bg-muted px-2 py-0.5 text-xs">{inv.token}</code>
                        </TableCell>
                        <TableCell className="text-sm">{inv.courseTitle}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{inv.cohortName}</TableCell>
                        <TableCell className="text-center text-sm">
                          {inv.activationCount} / {inv.maxActivations}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{inv.expiresAt}</TableCell>
                        <TableCell>
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                            {inv.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ),
            },
            {
              label: "Сертификаты",
              content: (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Номер</TableHead>
                      <TableHead>Слушатель</TableHead>
                      <TableHead>Курс</TableHead>
                      <TableHead>Выдан</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_CERTIFICATES.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell>
                          <code className="rounded bg-muted px-2 py-0.5 text-xs font-medium">{cert.number}</code>
                        </TableCell>
                        <TableCell className="text-sm">{cert.studentName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{cert.courseTitle}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(cert.issuedAt).toLocaleDateString("ru-RU")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ),
            },
            {
              label: "Аудит",
              content: (
                <div className="space-y-3">
                  {[
                    { action: "Новый пользователь зарегистрирован", actor: "Система", time: "10 мин. назад" },
                    { action: "Курс опубликован: AI Strategy Fundamentals", actor: "admin@academy.local", time: "1 ч. назад" },
                    { action: "Поток создан: AI Strategy — Поток B", actor: "admin@academy.local", time: "2 ч. назад" },
                    { action: "Импорт 10 слушателей завершён", actor: "admin@academy.local", time: "3 ч. назад" },
                    { action: "Seed completed", actor: "Система", time: "1 дн. назад" },
                  ].map((log, i) => (
                    <Card key={i} className="transition-shadow hover:shadow-sm">
                      <CardContent className="flex items-center gap-4 py-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                        </span>
                        <div className="flex-1">
                          <p className="text-sm">{log.action}</p>
                          <p className="text-xs text-muted-foreground">{log.actor}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{log.time}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
