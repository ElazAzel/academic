"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Link2, Plus, Trash2 } from "lucide-react";
import { MOCK_INVITES, MOCK_COURSES, MOCK_COHORTS } from "@/lib/mock-data";

export default function AdminInvitesPage() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <AppShell role="admin">
      <PageHeader title="Инвайт-ссылки" description="Управление доступом через инвайт-ссылки и токены. Вместо платежей — по приглашению." badge="Администратор" />

      <div className="space-y-6">
        <div className="flex gap-3">
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4" />
            Создать инвайт
          </Button>
        </div>

        {showCreate && (
          <Card className="rounded-2xl border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Новая инвайт-ссылка</CardTitle>
              <CardDescription>Создайте ссылку для доступа к курсу или потоку.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Курс</label>
                  <select className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm">
                    <option value="">Все курсы</option>
                    {MOCK_COURSES.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Поток</label>
                  <select className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm">
                    <option value="">Все потоки</option>
                    {MOCK_COHORTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Макс. активаций</label>
                  <input type="number" defaultValue={20} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium">Срок действия</label>
                  <input type="date" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Разрешённые email (по одному на строку, опционально)</label>
                <textarea className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm min-h-[80px]" placeholder="user1@company.com&#10;user2@company.com" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setShowCreate(false)}>Отмена</Button>
                <Button>Создать ссылку</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Токен</TableHead>
              <TableHead>Курс</TableHead>
              <TableHead>Поток</TableHead>
              <TableHead className="text-center">Использовано</TableHead>
              <TableHead>Срок</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_INVITES.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <code className="rounded bg-muted px-2 py-0.5 text-xs">{inv.token}</code>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{inv.courseTitle ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{inv.cohortName ?? "—"}</TableCell>
                <TableCell className="text-center text-sm">
                  <span className={inv.activationCount >= inv.maxActivations ? "text-rose-600 font-medium" : ""}>
                    {inv.activationCount}
                  </span>
                  {" / "}{inv.maxActivations}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{inv.expiresAt ?? "Бессрочно"}</TableCell>
                <TableCell>
                  <Badge className={inv.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-600"}>
                    {inv.status === "active" ? "Активен" : "Неактивен"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="secondary" title="Копировать ссылку">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="secondary" title="Деактивировать">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
