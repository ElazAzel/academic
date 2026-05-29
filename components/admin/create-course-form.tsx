"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readApiData, readApiErrorMessage } from "@/lib/api-client";

interface CreatedCourse {
  id: string;
}

export function CreateCourseForm({
  onSuccess,
  builderBasePath = "/instructor/courses",
}: {
  onSuccess?: () => void;
  builderBasePath?: "/instructor/courses" | "/admin/courses";
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const data = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      durationHours: Number(formData.get("durationHours")),
      traversalMode: formData.get("traversalMode") as "sequential" | "open",
    };

    try {
      const response = await fetch("/api/v1/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const course = await readApiData<CreatedCourse>(response);
        onSuccess?.();
        if (course?.id) {
          router.push(`${builderBasePath}/${course.id}/builder`);
        } else {
          router.refresh();
        }
      } else {
        setError(await readApiErrorMessage(response, "Не удалось создать курс"));
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold">Новый курс</h3>
      <div className="space-y-1">
        <label htmlFor="title" className="text-xs font-medium uppercase text-muted-foreground">Название</label>
        <Input id="title" name="title" required minLength={3} placeholder="Напр: Основы AI" />
      </div>
      <div className="space-y-1">
        <label htmlFor="description" className="text-xs font-medium uppercase text-muted-foreground">Описание</label>
        <textarea
          id="description"
          name="description"
          required
          minLength={10}
          className="min-h-[100px] w-full rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
          placeholder="О чем этот курс (мин. 10 символов)..."
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="durationHours" className="text-xs font-medium uppercase text-muted-foreground">Часы</label>
          <Input id="durationHours" name="durationHours" type="number" required min={0} defaultValue="10" />
        </div>
        <div className="space-y-1">
          <label htmlFor="traversalMode" className="text-xs font-medium uppercase text-muted-foreground">Режим</label>
          <select id="traversalMode" name="traversalMode" className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
            <option value="sequential">Последовательный</option>
            <option value="open">Свободный</option>
          </select>
        </div>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Создаем..." : "Создать курс"}
      </Button>
    </form>
  );
}
