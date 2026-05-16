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
          Заявка на восстановление пароля отправлена администратору.
        </p>
        <p className="text-sm text-muted-foreground">
          Ожидайте ответа на указанный email или свяжитесь с администратором напрямую.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Самостоятельное восстановление недоступно</p>
        <p>
          Для восстановления пароля отправьте заявку — администратор рассмотрит её
          и свяжется с вами по email.
        </p>
      </div>

      <label className="block text-sm font-medium">
        Ваш email (для связи)
        <Input
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
            Отправить заявку
          </>
        )}
      </Button>
    </form>
  );
}
