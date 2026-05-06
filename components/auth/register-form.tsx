"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: String(formData.get("email")),
        name: String(formData.get("name")),
        password: String(formData.get("password")),
        consentAccepted: formData.get("consentAccepted") === "on"
      })
    });
    setPending(false);
    setMessage(response.ok ? "Аккаунт создан. Проверьте email для подтверждения." : "Не удалось создать аккаунт.");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm font-medium">
        Имя
        <Input className="mt-2" name="name" required autoComplete="name" />
      </label>
      <label className="block text-sm font-medium">
        Email
        <Input className="mt-2" name="email" type="email" required autoComplete="email" />
      </label>
      <label className="block text-sm font-medium">
        Пароль
        <Input className="mt-2" name="password" type="password" required minLength={10} autoComplete="new-password" />
      </label>
      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <input className="mt-1 h-4 w-4 rounded border" name="consentAccepted" type="checkbox" required />
        Согласен на обработку персональных данных и условия платформы.
      </label>
      {message ? <p className="rounded-xl bg-muted p-3 text-sm">{message}</p> : null}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Создаём..." : "Зарегистрироваться"}
      </Button>
    </form>
  );
}

