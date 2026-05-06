"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function InstructorNewCoursePage() {
  return (
    <AppShell role="instructor">
      <PageHeader title="Создать курс" description="Основные данные, модули и публикация нового курса." badge="Преподаватель" />
      <Tabs tabs={[
        {
          label: "Основное",
          content: (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Основные данные</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Название курса *</label>
                  <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Название курса" />
                </div>
                <div>
                  <label className="text-sm font-medium">Описание *</label>
                  <textarea className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm min-h-[100px]" placeholder="Описание курса" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Цель курса</label>
                    <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Чему научится слушатель" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Длительность (часов)</label>
                    <input type="number" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue={10} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Режим прохождения</label>
                    <select className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm">
                      <option value="sequential">Последовательный</option>
                      <option value="open">Свободный</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">URL обложки</label>
                    <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="https://..." />
                  </div>
                </div>
                <Separator />
                <div className="flex justify-end gap-2">
                  <Button variant="secondary">Сохранить черновик</Button>
                  <Button>Далее: Модули</Button>
                </div>
              </CardContent>
            </Card>
          ),
        },
        {
          label: "Модули",
          content: (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Добавьте модули после сохранения основных данных курса.</CardContent></Card>
          ),
        },
        {
          label: "Публикация",
          content: (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Публикация станет доступна после создания модулей.</CardContent></Card>
          ),
        },
      ]} />
    </AppShell>
  );
}
