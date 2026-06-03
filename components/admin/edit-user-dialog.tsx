"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { updateUserAction, deleteUserAction } from "@/server/actions/admin";
import { toast } from "sonner";
import { DELETE_USER_ERROR, UPDATE_USER_ERROR, getSafeUserActionError, readUserActionResultError } from "./user-action-errors";

export function EditUserDialog({
  user,
}: {
  user: { id: string; name: string | null; email: string; status: string; realName?: string | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    formData.set("id", user.id);
    setPending(true);
    try {
      const result = await updateUserAction(formData);
      if (!result.success) {
        toast.error(readUserActionResultError(result, UPDATE_USER_ERROR));
        return;
      }
      toast.success("Пользователь обновлён");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(getSafeUserActionError(err, UPDATE_USER_ERROR));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" aria-label="Редактировать пользователя">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать пользователя</DialogTitle>
          <DialogDescription>Измените отображаемое имя, реальное имя и статус учетной записи.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium">Отображаемое имя</label>
            <p className="text-[10px] text-muted-foreground mb-1">Видит пользователь, куратор, супер-куратор и преподаватель</p>
            <Input id="name" name="name" defaultValue={user.name ?? ""} placeholder="Например: Слушатель №1" />
          </div>
          <div>
            <label htmlFor="realName" className="text-sm font-medium">Реальное имя</label>
            <p className="text-[10px] text-muted-foreground mb-1">Видит только админ. Используется в сертификате</p>
            <Input id="realName" name="realName" defaultValue={user.realName ?? ""} placeholder="Иван Петров" />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium">Эл. почта</label>
            <Input id="email" value={user.email} disabled className="bg-muted" />
          </div>
          <div>
            <label htmlFor="status" className="text-sm font-medium">Статус</label>
            <select id="status" name="status" defaultValue={user.status} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="ACTIVE">Активен</option>
              <option value="INACTIVE">Неактивен</option>
              <option value="BLOCKED">Заблокирован</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {pending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteUserButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm("Деактивировать пользователя? Его данные сохранятся, но доступ будет заблокирован.")) return;
    setPending(true);
    try {
      const result = await deleteUserAction(userId);
      if (!result.success) {
        toast.error(readUserActionResultError(result, DELETE_USER_ERROR));
        return;
      }
      toast.success("Пользователь деактивирован");
      router.refresh();
    } catch (err) {
      toast.error(getSafeUserActionError(err, DELETE_USER_ERROR));
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} disabled={pending} className="text-muted-foreground hover:text-red-600" aria-label="Деактивировать пользователя">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </Button>
  );
}
