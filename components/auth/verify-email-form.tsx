"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function VerifyEmailForm({ token }: { token?: string }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/auth/verify-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: String(formData.get("token")) })
    });

    setPending(false);
    setMessage(response.ok ? "Email подтверждён. Аккаунт готов к работе." : "Не удалось подтвердить email. Проверьте токен.");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm font-medium">
        Токен подтверждения
        <Input className="mt-2" name="token" defaultValue={token} required />
      </label>
      {message ? <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{message}</p> : null}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Проверяем..." : "Подтвердить email"}
      </Button>
    </form>
  );
}

