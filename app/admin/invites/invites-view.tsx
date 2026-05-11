"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Link2, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createInviteAction, deleteInviteAction } from "@/server/actions/invites";

export function InvitesView({
  invites,
  courses,
  cohorts,
}: {
  invites: Array<{
    id: string;
    token: string;
    courseTitle?: string | null;
    cohortName?: string | null;
    activationCount: number;
    maxActivations: number;
    expiresAt?: string | null;
    status: string;
  }>;
  courses: Array<{ id: string; title: string }>;
  cohorts: Array<{ id: string; name: string }>;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createInviteAction(formData);
        setShowCreate(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Ошибка при создании");
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Вы уверены?")) return;
    startTransition(async () => {
      try {
        await deleteInviteAction(id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Ошибка при удалении");
      }
    });
  }

  function copyToClipboard(token: string) {
    const url = `${window.location.origin}/register?invite=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Ссылка скопирована!");
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-2" />
          Создать инвайт
        </Button>
      </div>

      {showCreate && (
        <Card className="rounded-2xl border-primary/20">
          <form action={handleCreate}>
            <CardHeader>
              <CardTitle className="text-base">Новая инвайт-ссылка</CardTitle>
              <CardDescription>Создайте ссылку для доступа к курсу или потоку.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Курс</label>
                  <select name="courseId" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm">
                    <option value="">Все курсы</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Поток</label>
                  <select name="cohortId" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm">
                    <option value="">Все потоки</option>
                    {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Макс. активаций</label>
                  <input name="maxActivations" type="number" defaultValue={20} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium">Срок действия</label>
                  <input name="expiresAt" type="date" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Разрешённые email (по одному на строку, опционально)</label>
                <textarea name="allowedEmails" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm min-h-[80px]" placeholder="user1@company.com&#10;user2@company.com" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" type="button" onClick={() => setShowCreate(false)} disabled={isPending}>Отмена</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Создать ссылку
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {invites.length > 0 ? (
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
            {invites.map((inv) => (
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
                    <Button size="sm" variant="secondary" title="Копировать ссылку" onClick={() => copyToClipboard(inv.token)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      title="Удалить"
                      className="text-rose-600 hover:text-rose-700"
                      onClick={() => handleDelete(inv.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="py-10 text-center text-muted-foreground">
            Нет активных инвайт-ссылок.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
