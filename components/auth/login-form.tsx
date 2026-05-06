"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(formData.get("email")),
      password: String(formData.get("password")),
      redirect: false
    });
    setPending(false);
    if (result?.error) {
      setError("Неверный email или пароль");
      return;
    }
    router.push("/student");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm font-medium">
        Email
        <Input className="mt-2" name="email" type="email" required autoComplete="email" />
      </label>
      <label className="block text-sm font-medium">
        Пароль
        <Input className="mt-2" name="password" type="password" required autoComplete="current-password" />
      </label>
      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Входим..." : "Войти"}
      </Button>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="secondary" onClick={() => signIn("google")}>Google</Button>
        <Button type="button" variant="secondary" onClick={() => signIn("github")}>GitHub</Button>
      </div>
    </form>
  );
}

