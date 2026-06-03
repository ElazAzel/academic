"use client";

import { useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfileSettingsAction, updatePasswordAction } from "@/server/actions/settings";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

const PROFILE_SETTINGS_ERROR_MESSAGE = "Не удалось обновить профиль";
const PASSWORD_SETTINGS_ERROR_MESSAGE = "Не удалось обновить пароль";

const SAFE_SETTINGS_ACTION_MESSAGES = new Set([
  PROFILE_SETTINGS_ERROR_MESSAGE,
  PASSWORD_SETTINGS_ERROR_MESSAGE,
  "Текущий пароль обязателен",
  "Пароль должен быть минимум 10 символов",
  "Подтверждение пароля обязательно",
  "Новые пароли не совпадают",
  "Учетная запись не найдена",
  "Неверный текущий пароль",
]);

function getSafeSettingsErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && SAFE_SETTINGS_ACTION_MESSAGES.has(error.message)) {
    return error.message;
  }

  return fallback;
}

export function ProfileSettingsForm({ user }: { user: { name: string | null; email: string; } }) {
  const [isPending, startTransition] = useTransition();

  async function action(formData: FormData) {
    startTransition(async () => {
      try {
        await updateProfileSettingsAction(formData);
        toast.success("Профиль успешно обновлен");
      } catch (err) {
        toast.error(getSafeSettingsErrorMessage(err, PROFILE_SETTINGS_ERROR_MESSAGE));
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
              <label htmlFor="name" className="text-label-lg font-label-lg text-m3-on-surface-variant">Имя</label>
              <Input id="name" name="name" className="mt-1" defaultValue={user.name || ""} />
            </div>
            <div>
              <label htmlFor="email" className="text-label-lg font-label-lg text-m3-on-surface-variant">Email</label>
              <Input id="email" name="email" className="mt-1" defaultValue={user.email} disabled />
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
        toast.error(getSafeSettingsErrorMessage(err, PASSWORD_SETTINGS_ERROR_MESSAGE));
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
            <label htmlFor="currentPassword" className="text-label-lg font-label-lg text-m3-on-surface-variant">Текущий пароль</label>
            <Input id="currentPassword" name="currentPassword" type="password" required className="mt-1" placeholder="Текущий пароль" />
          </div>
          <div>
            <label htmlFor="newPassword" className="text-label-lg font-label-lg text-m3-on-surface-variant">Новый пароль</label>
            <Input id="newPassword" name="newPassword" type="password" required minLength={10} className="mt-1" placeholder="Мин. 10 символов" />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="text-label-lg font-label-lg text-m3-on-surface-variant">Повторите новый пароль</label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={10} className="mt-1" placeholder="Повторите пароль" />
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
