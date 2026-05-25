"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm({ token }: { token?: string }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password"));
    const passwordConfirm = String(formData.get("passwordConfirm"));

    if (password !== passwordConfirm) {
      setPending(false);
      setMessage("Пароли не совпадают.");
      return;
    }

    try {
      const response = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: String(formData.get("token")),
          password
        })
      });

      setPending(false);
      setMessage(response.ok ? "Пароль обновлён. Теперь можно войти." : "Не удалось обновить пароль. Проверьте токен.");
    } catch {
      setPending(false);
      setMessage("Не удалось обновить пароль. Проверьте подключение к интернету.");
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label htmlFor="token" className="block text-sm font-medium">
        Токен восстановления
        <Input id="token" className="mt-2" name="token" defaultValue={token} required />
      </label>
      <label htmlFor="password" className="block text-sm font-medium">
        Новый пароль
        <Input id="password" className="mt-2" name="password" type="password" required minLength={10} autoComplete="new-password" />
      </label>
      <label htmlFor="passwordConfirm" className="block text-sm font-medium">
        Повторите пароль
        <Input id="passwordConfirm" className="mt-2" name="passwordConfirm" type="password" required minLength={10} autoComplete="new-password" />
      </label>
      {message ? <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground" role="alert">{message}</p> : null}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Обновляем..." : "Обновить пароль"}
      </Button>
    </form>
  );
}

