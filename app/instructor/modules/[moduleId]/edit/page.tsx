import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, GripVertical } from "lucide-react";
import Link from "next/link";

const MOCK_LESSONS = [
  { id: "l1", order: 1, title: "Введение в AI-стратегию", type: "VIDEO", duration: 25 },
  { id: "l2", order: 2, title: "Ландшафт AI-технологий", type: "VIDEO", duration: 30 },
  { id: "l3", order: 3, title: "Тест: Основы стратегии", type: "QUIZ", duration: 15 },
];

export default function InstructorEditModulePage({ params }: { params: { moduleId: string } }) {
  return (
    <AppShell role="instructor">
      <div className="mb-4">
        <Link href="/instructor/courses"><Button size="sm" variant="secondary"><ArrowLeft className="h-4 w-4" />Назад к курсам</Button></Link>
      </div>
      <PageHeader title="Редактор модуля" description={`Модуль ${params.moduleId}: уроки, сроки и условия завершения.`} badge="Преподаватель" />
      <div className="space-y-6">
        <Card className="rounded-2xl">
          <CardContent className="space-y-4 py-6">
            <div>
              <label className="text-sm font-medium">Название модуля *</label>
              <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue="Модуль 1: Стратегия AI" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Описание</label>
                <textarea className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm min-h-[80px]" defaultValue="Основы AI-стратегии для бизнес-решений." />
              </div>
              <div>
                <label className="text-sm font-medium">Рекомендуемых дней</label>
                <input type="number" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue={7} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Уроки</h2>
          <Button size="sm"><Plus className="h-4 w-4" />Добавить урок</Button>
        </div>

        <div className="space-y-2">
          {MOCK_LESSONS.map((l) => (
            <Card key={l.id} className="transition-shadow hover:shadow-sm cursor-grab">
              <CardContent className="flex items-center gap-4 py-3">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground w-6">{l.order}.</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{l.title}</p>
                  <p className="text-xs text-muted-foreground">{l.type} · {l.duration} мин.</p>
                </div>
                <Button size="sm" variant="secondary">Редактировать</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />
        <div className="flex justify-end gap-2">
          <Button variant="secondary">Отмена</Button>
          <Button>Сохранить</Button>
        </div>
      </div>
    </AppShell>
  );
}
