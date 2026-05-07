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
  };
}

export function CourseEditForm({ course }: CourseEditFormProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
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
    };

    try {
      const response = await fetch(`/api/v1/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setMessage("Курс успешно обновлен!");
        router.refresh();
      } else {
        const errData = await response.json().catch(() => ({}));
        setMessage(errData.error?.message || "Ошибка при обновлении");
      }
    } catch {
      setMessage("Ошибка сети");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Название курса</label>
          <Input name="title" defaultValue={course.title} required minLength={3} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Статус</label>
          <select name="status" defaultValue={course.status} className="w-full h-10 rounded-xl border bg-white px-3 text-sm">
            <option value="DRAFT">Черновик</option>
            <option value="PUBLISHED">Опубликован</option>
            <option value="ARCHIVED">Архив</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Описание</label>
        <textarea
          name="description"
          defaultValue={course.description || ""}
          required
          minLength={10}
          className="w-full min-h-[120px] rounded-2xl border bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Главная цель</label>
          <Input name="goal" defaultValue={course.goal || ""} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Длительность (часов)</label>
          <Input name="durationHours" type="number" min={0} defaultValue={course.durationHours} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <span className={message.includes("успешно") ? "text-emerald-600 text-sm" : "text-rose-600 text-sm"}>{message}</span>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {pending ? "Сохраняем..." : "Сохранить изменения"}
        </Button>
      </div>
    </form>
  );
}
