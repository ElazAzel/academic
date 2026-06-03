"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateCohortAction } from "@/server/actions/admin";
import { toast } from "sonner";
import { UPDATE_COHORT_ERROR, getSafeCohortActionError, readCohortActionResultError } from "../cohort-form-errors";

export function EditCohortForm({
  cohort,
  courses,
}: {
  cohort: { id: string; name: string; courseId: string | null; startsAt: Date | null; endsAt: Date | null; status: string };
  courses: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const formData = new FormData(event.currentTarget);
      const result = await updateCohortAction(formData);
      if (!result.success) {
        toast.error(readCohortActionResultError(result, UPDATE_COHORT_ERROR));
        return;
      }
      toast.success("Поток обновлён");
      router.refresh();
    } catch (err) {
      toast.error(getSafeCohortActionError(err, UPDATE_COHORT_ERROR));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="id" value={cohort.id} />
      <div className="space-y-2">
        <label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase">Название потока</label>
        <input id="name" name="name" required defaultValue={cohort.name} className="w-full h-10 rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
      </div>
      <div className="space-y-2">
        <label htmlFor="courseId" className="text-xs font-medium text-muted-foreground uppercase">Курс</label>
        <select id="courseId" name="courseId" defaultValue={cohort.courseId ?? ""} className="w-full h-10 rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:ring-primary/20">
          <option value="">Выберите курс...</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="startsAt" className="text-xs font-medium text-muted-foreground uppercase">Дата начала</label>
          <input id="startsAt" name="startsAt" type="date" defaultValue={cohort.startsAt?.toISOString().slice(0, 10) ?? ""} className="w-full h-10 rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
        </div>
        <div className="space-y-2">
          <label htmlFor="endsAt" className="text-xs font-medium text-muted-foreground uppercase">Дата окончания</label>
          <input id="endsAt" name="endsAt" type="date" defaultValue={cohort.endsAt?.toISOString().slice(0, 10) ?? ""} className="w-full h-10 rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="status" className="text-xs font-medium text-muted-foreground uppercase">Статус</label>
        <select id="status" name="status" defaultValue={cohort.status} className="w-full h-10 rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:ring-primary/20">
          <option value="active">Активен</option>
          <option value="archived">Архив</option>
        </select>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Сохранение..." : "Сохранить изменения"}
      </Button>
    </form>
  );
}
