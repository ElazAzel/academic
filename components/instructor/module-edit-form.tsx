"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface ModuleEditFormProps {
  module: {
    id: string;
    title: string;
    description: string | null;
    order: number;
    recommendedDays: number;
    status: string;
    courseId: string;
  };
}

export function ModuleEditForm({ module }: ModuleEditFormProps) {
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
      description: formData.get("description") as string || null,
      recommendedDays: Number(formData.get("recommendedDays")),
      status: formData.get("status") as string,
    };

    try {
      const response = await fetch(`/api/v1/modules/${module.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setMessage("Модуль успешно обновлен!");
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
      <div className="flex items-center justify-between mb-6">
        <Link href={`/instructor/courses/${module.courseId}/builder`}>
          <Button type="button" size="sm" variant="secondary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            К учебному плану
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <span className={success ? "text-emerald-600 text-sm font-medium" : "text-rose-600 text-sm font-medium"}>{message}</span>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Сохраняем..." : "Сохранить модуль"}
          </Button>
        </div>
      </div>

      <Card className="rounded-lg border">
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="title" className="text-xs font-semibold uppercase text-muted-foreground">Название модуля *</label>
              <Input id="title" name="title" defaultValue={module.title} required minLength={2} />
            </div>
            <div className="space-y-2">
              <label htmlFor="status" className="text-xs font-semibold uppercase text-muted-foreground">Статус</label>
              <select id="status" name="status" defaultValue={module.status} className="w-full h-10 rounded-lg border bg-background px-3 text-sm">
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
              defaultValue={module.description || ""}
              className="w-full min-h-[100px] rounded-lg border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="recommendedDays" className="text-xs font-semibold uppercase text-muted-foreground">Рекомендуемых дней на прохождение</label>
            <Input id="recommendedDays" name="recommendedDays" type="number" min={1} defaultValue={module.recommendedDays} />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
