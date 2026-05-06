"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: String(formData.get("email")) })
    });

    setPending(false);
    setMessage(
      response.ok
        ? "Если такой email есть в системе, ссылка для восстановления будет отправлена."
        : "Не удалось создать запрос на восстановление. Проверьте email и попробуйте ещё раз."
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm font-medium">
        Email
        <Input className="mt-2" name="email" type="email" placeholder="email@example.com" required autoComplete="email" />
      </label>
      {message ? <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{message}</p> : null}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Отправляем..." : "Отправить ссылку"}
      </Button>
    </form>
  );
}

