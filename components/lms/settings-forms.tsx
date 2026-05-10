"use client";

import { useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { updateProfileSettingsAction, updatePasswordAction } from "@/server/actions/settings";
import { Loader2 } from "lucide-react";

export function ProfileSettingsForm({ user }: { user: { name: string | null; email: string; } }) {
  const [isPending, startTransition] = useTransition();

  async function action(formData: FormData) {
    startTransition(async () => {
      try {
        await updateProfileSettingsAction(formData);
        alert("Профиль успешно обновлен");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Ошибка при обновлении профиля");
      }
    });
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Имя</label>
          <input name="name" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue={user.name || ""} />
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue={user.email} disabled />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Сохранить
        </Button>
      </div>
    </form>
  );
}

export function SecuritySettingsForm() {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function action(formData: FormData) {
    startTransition(async () => {
      try {
        await updatePasswordAction(formData);
        alert("Пароль успешно изменен");
        formRef.current?.reset();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Ошибка при изменении пароля");
      }
    });
  }

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Текущий пароль</label>
        <input name="currentPassword" type="password" required className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Текущий пароль" />
      </div>
      <div>
        <label className="text-sm font-medium">Новый пароль</label>
        <input name="newPassword" type="password" required minLength={10} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Мин. 10 символов" />
      </div>
      <div>
        <label className="text-sm font-medium">Повторите новый пароль</label>
        <input name="confirmPassword" type="password" required minLength={10} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Повторите пароль" />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Изменить пароль
        </Button>
      </div>
    </form>
  );
}
