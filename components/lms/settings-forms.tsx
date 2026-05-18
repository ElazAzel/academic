"use client";

import { useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfileSettingsAction, updatePasswordAction } from "@/server/actions/settings";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

export function ProfileSettingsForm({ user }: { user: { name: string | null; email: string; } }) {
  const [isPending, startTransition] = useTransition();

  async function action(formData: FormData) {
    startTransition(async () => {
      try {
        await updateProfileSettingsAction(formData);
        toast.success("Профиль успешно обновлен");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Ошибка при обновлении профиля");
      }
    });
  }

  return (
    <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
      <CardHeader>
        <CardTitle className="text-title-lg font-title-lg text-m3-on-surface">Профиль</CardTitle>
        <CardDescription className="text-body-md font-body-md text-m3-on-surface-variant">Имя и контактные данные</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-label-lg font-label-lg text-m3-on-surface-variant">Имя</label>
              <Input name="name" className="mt-1" defaultValue={user.name || ""} />
            </div>
            <div>
              <label className="text-label-lg font-label-lg text-m3-on-surface-variant">Email</label>
              <Input className="mt-1" defaultValue={user.email} disabled />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending && <Icon name="progress_activity" size={16} className="mr-2 animate-spin" />}
              Сохранить
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function SecuritySettingsForm() {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function action(formData: FormData) {
    startTransition(async () => {
      try {
        await updatePasswordAction(formData);
        toast.success("Пароль успешно изменен");
        formRef.current?.reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Ошибка при изменении пароля");
      }
    });
  }

  return (
    <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
      <CardHeader>
        <CardTitle className="text-title-lg font-title-lg text-m3-on-surface">Безопасность</CardTitle>
        <CardDescription className="text-body-md font-body-md text-m3-on-surface-variant">Смена пароля</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={action} className="space-y-4">
          <div>
            <label className="text-label-lg font-label-lg text-m3-on-surface-variant">Текущий пароль</label>
            <Input name="currentPassword" type="password" required className="mt-1" placeholder="Текущий пароль" />
          </div>
          <div>
            <label className="text-label-lg font-label-lg text-m3-on-surface-variant">Новый пароль</label>
            <Input name="newPassword" type="password" required minLength={10} className="mt-1" placeholder="Мин. 10 символов" />
          </div>
          <div>
            <label className="text-label-lg font-label-lg text-m3-on-surface-variant">Повторите новый пароль</label>
            <Input name="confirmPassword" type="password" required minLength={10} className="mt-1" placeholder="Повторите пароль" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending && <Icon name="progress_activity" size={16} className="mr-2 animate-spin" />}
              Изменить пароль
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
