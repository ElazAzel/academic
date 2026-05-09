import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";

const UNASSIGNED = [
  { id: "s11", name: "Слушатель 11", email: "student11@academy.local", course: "AI Strategy Fundamentals" },
  { id: "s12", name: "Слушатель 12", email: "student12@academy.local", course: "Prompt Engineering for Leaders" },
];

const CURATORS = ["Куратор Мадина", "Куратор Арман", "Куратор Дана"];

export default async function SuperCuratorDistributionPage() {
  await requireRolePage(["super_curator"]);

  return (
    <AppShell role="super_curator">
      <PageHeader title="Распределение слушателей" description="Назначение кураторов нераспределённым слушателям." badge="Супер-куратор" />
      <div className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Нераспределённые слушатели</CardTitle>
            </div>
            <CardDescription>{UNASSIGNED.length} слушателей ожидают назначения куратора.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {UNASSIGNED.map((s) => (
              <div key={s.id} className="flex items-center gap-4 rounded-xl border p-4 transition-shadow hover:shadow-sm">
                <Avatar name={s.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.email} · {s.course}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select className="rounded-lg border bg-background px-3 py-1.5 text-sm">
                    <option value="">Выбрать куратора</option>
                    {CURATORS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Button size="sm">Назначить</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Перераспределение</CardTitle>
            <CardDescription>Переназначить слушателей между кураторами для балансировки нагрузки.</CardDescription>
          </CardHeader>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="text-sm">Функция автоматического перераспределения будет доступна в следующем обновлении.</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
