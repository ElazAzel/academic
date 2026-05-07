"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export function CreateCourseForm({ onSuccess }: { onSuccess?: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
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
        onSuccess?.();
        router.refresh();
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error?.message || "Не удалось создать курс");
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl border">
      <h3 className="text-lg font-semibold">Новый курс</h3>
      <div className="space-y-1">
        <label className="text-xs font-medium uppercase text-muted-foreground">Название</label>
        <Input name="title" required minLength={3} placeholder="Напр: Основы AI" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium uppercase text-muted-foreground">Описание</label>
        <textarea 
          name="description" 
          required
          minLength={10}
          className="w-full min-h-[100px] rounded-xl border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20" 
          placeholder="О чем этот курс (мин. 10 символов)..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase text-muted-foreground">Часы</label>
          <Input name="durationHours" type="number" required min={0} defaultValue="10" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase text-muted-foreground">Режим</label>
          <select name="traversalMode" className="w-full h-10 rounded-xl border bg-white px-3 text-sm">
            <option value="sequential">Последовательный</option>
            <option value="open">Свободный</option>
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Создаем..." : "Создать курс"}
      </Button>
    </form>
  );
}
