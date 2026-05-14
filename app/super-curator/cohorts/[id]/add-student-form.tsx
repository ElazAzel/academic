"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { addStudentToCohortAction } from "@/server/actions/super-curator";
import { toast } from "sonner";

export function AddStudentForm({
  cohortId,
  courseTitle,
  courseId,
}: {
  cohortId: string;
  courseTitle: string;
  courseId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    formData.set("cohortId", cohortId);
    setPending(true);
    try {
      const result = await addStudentToCohortAction(formData);
      if (result.success) {
        toast.success("Слушатель добавлен в поток");
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
          <UserPlus className="h-4 w-4 mr-1" />
          Добавить участника
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить участника в поток</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Курс</label>
            <input
              className="mt-1 w-full rounded-xl border bg-muted px-3 py-2 text-sm"
              value={courseTitle}
              disabled
            />
            <input type="hidden" name="courseId" value={courseId ?? ""} />
          </div>
          <div>
            <label className="text-sm font-medium">Email слушателя</label>
            <Input name="email" type="email" required placeholder="student@example.com" />
            <p className="text-xs text-muted-foreground mt-1">Введите email пользователя с ролью &laquo;Слушатель&raquo;.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={pending}>{pending ? "Добавление..." : "Добавить"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
