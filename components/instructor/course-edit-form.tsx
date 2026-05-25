"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

interface CourseEditFormProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    goal: string | null;
    durationHours: number;
    status: string;
    traversalMode: string;
    coverUrl?: string | null;
  };
}

export function CourseEditForm({ course }: CourseEditFormProps) {
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
      description: formData.get("description") as string,
      goal: formData.get("goal") as string,
      durationHours: Number(formData.get("durationHours")),
      status: formData.get("status") as string,
      traversalMode: formData.get("traversalMode") as string,
      coverUrl: formData.get("coverUrl") as string || null,
    };

    try {
      const response = await fetch(`/api/v1/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setMessage("Курс успешно обновлен!");
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="title" className="text-xs font-semibold uppercase text-muted-foreground">Название курса</label>
          <Input id="title" name="title" defaultValue={course.title} required minLength={3} />
        </div>
        <div className="space-y-2">
          <label htmlFor="status" className="text-xs font-semibold uppercase text-muted-foreground">Статус</label>
          <select id="status" name="status" defaultValue={course.status} className="w-full h-10 rounded-lg border bg-background px-3 text-sm">
            <option value="DRAFT">Черновик</option>
            <option value="PUBLISHED">Опубликован</option>
            <option value="ARCHIVED">Архив</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-xs font-semibold uppercase text-muted-foreground">Описание</label>
        <textarea
          id="description"
          name="description"
          defaultValue={course.description || ""}
          required
          minLength={10}
          className="w-full min-h-[120px] rounded-lg border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="goal" className="text-xs font-semibold uppercase text-muted-foreground">Главная цель</label>
          <Input id="goal" name="goal" defaultValue={course.goal || ""} />
        </div>
        <div className="space-y-2">
          <label htmlFor="durationHours" className="text-xs font-semibold uppercase text-muted-foreground">Длительность (часов)</label>
          <Input id="durationHours" name="durationHours" type="number" min={0} defaultValue={course.durationHours} />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="traversalMode" className="text-xs font-semibold uppercase text-muted-foreground">Режим прохождения</label>
          <select id="traversalMode" name="traversalMode" defaultValue={course.traversalMode} className="w-full h-10 rounded-lg border bg-background px-3 text-sm">
            <option value="sequential">Последовательный</option>
            <option value="open">Свободный</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="coverUrl" className="text-xs font-semibold uppercase text-muted-foreground">URL обложки</label>
          <Input id="coverUrl" name="coverUrl" defaultValue={course.coverUrl || ""} placeholder="https://..." />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <span className={success ? "text-emerald-600 text-sm" : "text-rose-600 text-sm"}>{message}</span>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {pending ? "Сохраняем..." : "Сохранить изменения"}
        </Button>
      </div>
    </form>
  );
}
