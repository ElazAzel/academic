import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function InstructorEditCoursePage({ params }: { params: { courseId: string } }) {
  return (
    <AppShell role="instructor">
      <div className="mb-4">
        <Link href="/instructor/courses"><Button size="sm" variant="secondary"><ArrowLeft className="h-4 w-4" />Назад к курсам</Button></Link>
      </div>
      <PageHeader title="Редактировать курс" description={`Редактор курса ${params.courseId}: описание, инструкторы, настройки доступа.`} badge="Преподаватель" />
      <Card className="rounded-2xl">
        <CardContent className="space-y-4 py-6">
          <div>
            <label className="text-sm font-medium">Название курса *</label>
            <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue="AI Strategy Fundamentals" />
          </div>
          <div>
            <label className="text-sm font-medium">Описание *</label>
            <textarea className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm min-h-[100px]" defaultValue="Практический курс по AI-стратегии для руководителей и менеджеров." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Цель курса</label>
              <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue="Внедрять AI безопасно и результативно" />
            </div>
            <div>
              <label className="text-sm font-medium">Длительность (часов)</label>
              <input type="number" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue={18} />
            </div>
          </div>
          <Separator />
          <div className="flex justify-end gap-2">
            <Button variant="secondary">Отмена</Button>
            <Button>Сохранить</Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
