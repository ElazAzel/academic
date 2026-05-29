"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createCohortAction } from "@/server/actions/admin";
import { toast } from "sonner";

export function CreateCohortForm({ courses }: { courses: { id: string; title: string }[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const formData = new FormData(event.currentTarget);
      const result = await createCohortAction(formData);
      if (result.success) {
        toast.success("Поток создан");
        router.push("/admin/cohorts");
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase">Название потока</label>
        <input id="name" name="name" required className="w-full h-10 rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Например: AI Strategy Q3 2026" />
      </div>
      <div className="space-y-2">
        <label htmlFor="courseId" className="text-xs font-medium text-muted-foreground uppercase">Курс</label>
        <select id="courseId" name="courseId" required className="w-full h-10 rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:ring-primary/20">
          <option value="">Выберите курс...</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="startsAt" className="text-xs font-medium text-muted-foreground uppercase">Дата начала</label>
          <input id="startsAt" name="startsAt" type="date" className="w-full h-10 rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
        </div>
        <div className="space-y-2">
          <label htmlFor="endsAt" className="text-xs font-medium text-muted-foreground uppercase">Дата окончания</label>
          <input id="endsAt" name="endsAt" type="date" className="w-full h-10 rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Создание..." : "Создать поток"}
      </Button>
    </form>
  );
}