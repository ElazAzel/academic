"use client";

import { useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { updateProfileSettingsAction, updatePasswordAction } from "@/server/actions/settings";
import { Loader2 } from "lucide-react";
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
    <Card>
      <CardHeader>
        <CardTitle>Профиль</CardTitle>
        <CardDescription>Имя и контактные данные</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Имя</label>
              <Input name="name" className="mt-1" defaultValue={user.name || ""} />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input className="mt-1" defaultValue={user.email} disabled />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
    <Card>
      <CardHeader>
        <CardTitle>Безопасность</CardTitle>
        <CardDescription>Смена пароля</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={action} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Текущий пароль</label>
            <Input name="currentPassword" type="password" required className="mt-1" placeholder="Текущий пароль" />
          </div>
          <div>
            <label className="text-sm font-medium">Новый пароль</label>
            <Input name="newPassword" type="password" required minLength={10} className="mt-1" placeholder="Мин. 10 символов" />
          </div>
          <div>
            <label className="text-sm font-medium">Повторите новый пароль</label>
            <Input name="confirmPassword" type="password" required minLength={10} className="mt-1" placeholder="Повторите пароль" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Изменить пароль
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
