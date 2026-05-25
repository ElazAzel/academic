"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { createCohortAction, updateCohortAction, deleteCohortAction } from "@/server/actions/super-curator";
import { toast } from "sonner";

export function CreateCohortForm({ courses }: { courses: { id: string; title: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      const result = await createCohortAction(formData);
      if (result.success) {
        toast.success("Поток создан");
        setOpen(false);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          Создать поток
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать поток</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium">Название потока</label>
            <Input id="name" name="name" required placeholder="Например: AI Strategy — Поток C" />
          </div>
          <div>
            <label htmlFor="courseId" className="text-sm font-medium">Курс</label>
            <select id="courseId" name="courseId" required className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="">Выберите курс</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="startsAt" className="text-sm font-medium">Дата старта</label>
              <Input id="startsAt" name="startsAt" type="date" />
            </div>
            <div>
              <label htmlFor="endsAt" className="text-sm font-medium">Дата окончания</label>
              <Input id="endsAt" name="endsAt" type="date" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={pending}>{pending ? "Создание..." : "Создать"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditCohortForm({
  cohort,
  trigger,
}: {
  cohort: { id: string; name: string; startsAt: string | null; endsAt: string | null; status: string };
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    formData.set("id", cohort.id);
    setPending(true);
    try {
      const result = await updateCohortAction(formData);
      if (result.success) {
        toast.success("Поток обновлён");
        setOpen(false);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Архивировать поток? Слушатели останутся в курсе.")) return;
    setPending(true);
    try {
      const result = await deleteCohortAction(cohort.id);
      if (result.success) {
        toast.success("Поток архивирован");
        setOpen(false);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="secondary" size="sm"><Pencil className="h-3.5 w-3.5 mr-1" />Редактировать</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать поток</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium">Название</label>
            <Input id="name" name="name" defaultValue={cohort.name} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="startsAt" className="text-sm font-medium">Дата старта</label>
              <Input id="startsAt" name="startsAt" type="date" defaultValue={cohort.startsAt?.slice(0, 10) ?? ""} />
            </div>
            <div>
              <label htmlFor="endsAt" className="text-sm font-medium">Дата окончания</label>
              <Input id="endsAt" name="endsAt" type="date" defaultValue={cohort.endsAt?.slice(0, 10) ?? ""} />
            </div>
          </div>
          <div>
            <label htmlFor="status" className="text-sm font-medium">Статус</label>
            <select id="status" name="status" defaultValue={cohort.status} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="active">Активен</option>
              <option value="draft">Черновик</option>
              <option value="archived">Архив</option>
            </select>
          </div>
          <div className="flex justify-between">
            <Button type="button" variant="danger" size="sm" onClick={handleDelete} disabled={pending}>
              Архивировать
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={pending}>{pending ? "Сохранение..." : "Сохранить"}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
