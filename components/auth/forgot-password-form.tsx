"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Send } from "lucide-react";

type Step = "form" | "sent";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("form");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: String(formData.get("email")) }),
      });
    } catch {
      // Silent — не показываем ошибку, чтобы не раскрывать наличие email в системе
    } finally {
      setPending(false);
      setStep("sent");
    }
  }

  if (step === "sent") {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          Если аккаунт с таким email существует, мы отправили на него ссылку для восстановления пароля.
        </p>
        <p className="text-sm text-muted-foreground">
          Проверьте почту. Если письмо не пришло в течение 5 минут, проверьте папку «Спам».
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <p className="text-sm text-muted-foreground">
        Введите email, привязанный к вашему аккаунту. Мы отправим ссылку для сброса пароля.
      </p>

      <label htmlFor="email" className="block text-sm font-medium">
        Email
        <Input
          id="email"
          className="mt-2"
          name="email"
          type="email"
          placeholder="email@example.com"
          required
          autoComplete="email"
        />
      </label>

      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? (
          "Отправляем..."
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Отправить ссылку
          </>
        )}
      </Button>
    </form>
  );
}
