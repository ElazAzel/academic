"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OAuthProviderFlags } from "@/server/auth/provider-flags";

export function LoginForm({ oauthProviders }: { oauthProviders: OAuthProviderFlags }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const hasOAuth = oauthProviders.google || oauthProviders.github;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      password: String(formData.get("password") ?? ""),
      redirect: false,
    });

    if (result?.error) {
      setPending(false);
      setError("Неверный логин или пароль");
      return;
    }

    const targetResponse = await fetch("/api/v1/auth/redirect-target", { cache: "no-store" });
    const payload = (await targetResponse.json().catch(() => null)) as { data?: { path?: string } } | null;
    router.replace(payload?.data?.path ?? "/student");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm font-medium">
        Логин / Email
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
      {hasOAuth ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {oauthProviders.google ? (
            <Button type="button" variant="secondary" onClick={() => signIn("google")}>
              Google
            </Button>
          ) : null}
          {oauthProviders.github ? (
            <Button type="button" variant="secondary" onClick={() => signIn("github")}>
              GitHub
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
