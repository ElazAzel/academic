"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import Link from "next/link";

interface LessonEditFormProps {
  lesson: {
    id: string;
    title: string;
    type: string;
    summary: string | null;
    content: { text?: string } | null;
    videoUrl: string | null;
    durationMinutes: number;
    isRequired: boolean;
    moduleId: string;
    module: {
      course: {
        id: string;
      }
    }
  };
}

export function LessonEditForm({ lesson }: LessonEditFormProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(true);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const data = {
      title: formData.get("title") as string,
      type: formData.get("type") as string,
      durationMinutes: Number(formData.get("durationMinutes")),
      videoUrl: formData.get("videoUrl") as string || null,
      summary: formData.get("summary") as string || null,
      content: { text: formData.get("contentText") as string },
      isRequired: formData.get("isRequired") === "on",
    };

    try {
      const response = await fetch(`/api/v1/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setMessage("Урок успешно обновлен!");
        setSuccess(true);
        router.refresh();
      } else {
        const errData = await response.json().catch(() => ({}));
        setMessage(errData.error?.message || "Ошибка при обновлении");
        setSuccess(false);
      }
    } catch {
      setMessage("Ошибка сети");
      setSuccess(false);
    } finally {
      setPending(false);
    }
  }

  const contentTab = (
    <Card className="rounded-lg border-0 shadow-none">
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Название урока *</label>
            <Input name="title" defaultValue={lesson.title} required minLength={2} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Тип урока</label>
            <select name="type" defaultValue={lesson.type} className="w-full h-10 rounded-lg border bg-background px-3 text-sm">
              <option value="VIDEO">Видео</option>
              <option value="TEXT">Текст</option>
              <option value="VIDEO_DOCUMENT">Видео + документ</option>
              <option value="QUIZ">Тест</option>
              <option value="ASSIGNMENT">Задание</option>
              <option value="MIXED">Смешанный</option>
            </select>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Длительность (мин.)</label>
            <Input name="durationMinutes" type="number" min={0} defaultValue={lesson.durationMinutes} />
          </div>
          <div className="flex items-center gap-2 pt-8">
            <input type="checkbox" id="isRequired" name="isRequired" defaultChecked={lesson.isRequired} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
            <label htmlFor="isRequired" className="text-sm font-medium">Обязательный урок</label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">URL видео (если применимо)</label>
          <Input name="videoUrl" defaultValue={lesson.videoUrl || ""} placeholder="https://..." />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Краткое описание (summary)</label>
          <textarea
            name="summary"
            defaultValue={lesson.summary || ""}
            className="w-full min-h-[80px] rounded-lg border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Текстовый контент (Markdown)</label>
          <textarea
            name="contentText"
            defaultValue={lesson.content?.text || ""}
            className="w-full min-h-[300px] rounded-lg border bg-background px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-6">
        <Link href={`/instructor/courses/${lesson.module.course.id}/builder`}>
          <Button type="button" size="sm" variant="secondary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            К учебному плану
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <span className={success ? "text-emerald-600 text-sm font-medium" : "text-rose-600 text-sm font-medium"}>{message}</span>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Сохраняем..." : "Сохранить урок"}
          </Button>
        </div>
      </div>

      <Tabs tabs={[
        { label: "Контент", content: contentTab },
        { label: "Медиа", content: <div className="mt-4 rounded-lg border-2 border-dashed p-10 text-center text-muted-foreground">Загрузка файлов будет доступна в следующей версии.</div> },
        { label: "Тесты / Задания", content: <div className="mt-4 rounded-lg border-2 border-dashed p-10 text-center text-muted-foreground">Редактирование связанных объектов доступно через специальные модули.</div> }
      ]} />
    </form>
  );
}
