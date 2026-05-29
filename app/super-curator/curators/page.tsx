import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getSuperCuratorCurators } from "@/server/actions/super-curator";
import { AddCuratorDialog } from "./add-curator-form";

export const metadata = {
  title: "Кураторы — Супер-куратор",
  description: "Управление кураторами.",
};


export const dynamic = "force-dynamic";

export default async function SuperCuratorCuratorsPage() {
  await requireRolePage(["super_curator", "admin"]);
  const curators = await getSuperCuratorCurators();

  return (
    <AppShell role="super_curator">
      <div className="flex items-start justify-between mb-6">
        <PageHeader title="Кураторы" description="Управление кураторами, нагрузка и активность." />
        <AddCuratorDialog />
      </div>

      {curators.length === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
          <p className="text-sm">Нет кураторов. Добавьте первого куратора через кнопку &laquo;Добавить куратора&raquo;.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {curators.map((cur) => (
            <a key={cur.id} href={`/super-curator/curators/${cur.id}`} className="block">
              <Card className="h-full transition-colors">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={cur.name} className="h-10 w-10" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{cur.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{cur.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {cur.cohorts.map((ch) => (
                      <Badge key={ch} className="bg-primary/5 text-primary border-primary/20 text-[10px]">{ch}</Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-muted p-2">
                      <p className="font-bold text-sm">{cur.studentCount}</p>
                      <p className="text-muted-foreground">Слушателей</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2">
                      <p className="font-bold text-sm">{cur.questionsCount}</p>
                      <p className="text-muted-foreground">Вопросов</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2">
                      <p className="font-bold text-sm">{cur.lastLoginAt ? Math.floor((Date.now() - new Date(cur.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24)) : "—"}</p>
                      <p className="text-muted-foreground">Дней назад</p>
                    </div>
                  </div>

                  {cur.lastActions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Последние действия</p>
                      {cur.lastActions.slice(0, 3).map((a, i) => (
                        <p key={i} className="text-xs text-muted-foreground truncate">
                          {a.action} — {new Date(a.createdAt).toLocaleDateString("ru")}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </AppShell>
  );
}
