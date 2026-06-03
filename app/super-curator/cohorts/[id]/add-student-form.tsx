"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { addStudentToCohortAction } from "@/server/actions/super-curator";
import { toast } from "sonner";
import {
  ADD_STUDENT_TO_COHORT_ERROR,
  getSafeSuperCuratorActionError,
  readSuperCuratorActionResultError,
} from "@/app/super-curator/action-errors";

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
      } else {
        toast.error(readSuperCuratorActionResultError(result, ADD_STUDENT_TO_COHORT_ERROR));
      }
    } catch (err) {
      toast.error(getSafeSuperCuratorActionError(err, ADD_STUDENT_TO_COHORT_ERROR));
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
          <DialogDescription>Укажите почту существующего слушателя, чтобы добавить его в выбранный поток.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="courseTitle" className="text-sm font-medium">Курс</label>
            <input
              id="courseTitle"
              className="mt-1 w-full rounded-lg border bg-muted px-3 py-2 text-sm"
              value={courseTitle}
              disabled
            />
            <input type="hidden" name="courseId" value={courseId ?? ""} />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium">Почта слушателя</label>
            <Input id="email" name="email" type="email" required placeholder="student@example.com" />
            <p className="text-xs text-muted-foreground mt-1">Введите почту пользователя с ролью &laquo;Слушатель&raquo;.</p>
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
