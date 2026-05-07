"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function InstructorEditLessonPage({ params }: { params: { lessonId: string } }) {
  return (
    <AppShell role="instructor">
      <div className="mb-4">
        <Link href="/instructor/courses"><Button size="sm" variant="secondary"><ArrowLeft className="h-4 w-4" />Назад</Button></Link>
      </div>
      <PageHeader title="Редактор урока" description={`Урок ${params.lessonId}: контент, медиа, тесты и задания.`} badge="Преподаватель" />
      <Tabs tabs={[
        {
          label: "Контент",
          content: (
            <Card className="rounded-2xl">
              <CardContent className="space-y-4 py-6">
                <div>
                  <label className="text-sm font-medium">Название урока *</label>
                  <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue="Введение в AI-стратегию" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Тип урока</label>
                    <select className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm">
                      <option value="VIDEO">Видео</option>
                      <option value="TEXT">Текст</option>
                      <option value="VIDEO_DOCUMENT">Видео + документ</option>
                      <option value="QUIZ">Тест</option>
                      <option value="ASSIGNMENT">Задание</option>
                      <option value="MIXED">Смешанный</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Длительность (мин.)</label>
                    <input type="number" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue={25} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">URL видео</label>
                  <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="https://www.youtube.com/embed/..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Краткое описание</label>
                  <textarea className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm min-h-[80px]" placeholder="Краткое описание урока" />
                </div>
                <div>
                  <label className="text-sm font-medium">Текстовый контент (Markdown)</label>
                  <textarea className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm min-h-[200px] font-mono text-xs" placeholder="# Заголовок&#10;&#10;Контент урока..." />
                </div>
              </CardContent>
            </Card>
          ),
        },
        {
          label: "Медиа",
          content: (
            <Card className="rounded-2xl">
              <CardContent className="py-6">
                <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-10">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Перетащите файлы сюда</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, изображения, видео</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ),
        },
        {
          label: "Тест / Задание",
          content: (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Используйте конструктор тестов или заданий из меню.</CardContent></Card>
          ),
        },
      ]} />
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary">Отмена</Button>
        <Button>Сохранить</Button>
      </div>
    </AppShell>
  );
}
