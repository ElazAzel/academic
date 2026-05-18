"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { OAuthProviderFlags } from "@/server/auth/provider-flags";

export function LoginForm({ oauthProviders }: { oauthProviders: OAuthProviderFlags }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const hasOAuth = oauthProviders.google || oauthProviders.github;

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !hydrated) return;

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

    try {
      const targetResponse = await fetch("/api/v1/auth/redirect-target", { cache: "no-store" });
      const payload = (await targetResponse.json().catch(() => null)) as { data?: { path?: string } } | null;
      setPending(false);
      router.replace(payload?.data?.path ?? "/student");
    } catch {
      setPending(false);
      router.replace("/student");
    }
  }

  return (
    <form className="flex flex-col gap-md" onSubmit={onSubmit} data-auth-ready={hydrated ? "true" : "false"}>
      {/* Email */}
      <div className="flex flex-col gap-xs">
        <label className="font-label-md text-label-md text-m3-on-surface" htmlFor="email">E-mail</label>
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-sm top-1/2 -translate-y-1/2 text-[20px] text-m3-outline" aria-hidden="true">mail</span>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Введите ваш e-mail"
            className="w-full rounded border border-m3-outline-variant bg-m3-surface py-[10px] pl-xxl pr-md text-body-md font-body-md text-m3-on-surface shadow-sm placeholder:text-m3-outline transition-all focus:border-m3-primary focus:outline-none focus:ring-2 focus:ring-m3-primary/20"
            onChange={() => setError("")}
          />
        </div>
      </div>

      {/* Password */}
      <div className="flex flex-col gap-xs">
        <div className="flex items-center justify-between">
          <label className="font-label-md text-label-md text-m3-on-surface" htmlFor="password">Пароль</label>
          <a href="/forgot-password" className="font-label-md text-label-md text-m3-primary transition-colors hover:text-m3-primary-container hover:underline">
            Забыли пароль?
          </a>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-sm top-1/2 -translate-y-1/2 text-[20px] text-m3-outline" aria-hidden="true">lock</span>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Введите пароль"
            className="w-full rounded border border-m3-outline-variant bg-m3-surface py-[10px] pl-xxl pr-md text-body-md font-body-md text-m3-on-surface shadow-sm placeholder:text-m3-outline transition-all focus:border-m3-primary focus:outline-none focus:ring-2 focus:ring-m3-primary/20"
            onChange={() => setError("")}
          />
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error ? (
          <motion.p
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden rounded-md bg-m3-error-container px-md py-sm text-body-sm font-body-sm text-m3-error"
            role="alert"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {/* Submit */}
      <button
        type="submit"
        disabled={pending || !hydrated}
        className="mt-sm flex w-full items-center justify-center gap-sm rounded bg-m3-primary py-md text-label-lg font-label-lg text-m3-on-primary shadow-sm transition-colors hover:bg-m3-primary-container active:scale-[0.99] disabled:opacity-50"
      >
        <span>{pending ? "Входим..." : "Войти в систему"}</span>
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_forward</span>
      </button>

      {/* OAuth */}
      {hasOAuth ? (
        <div className="mt-sm grid gap-2 sm:grid-cols-2">
          {oauthProviders.google ? (
            <button
              type="button"
              onClick={() => signIn("google")}
              aria-label="Google"
              className="flex items-center justify-center gap-sm rounded border border-m3-outline-variant bg-m3-surface py-md text-label-lg font-label-lg text-m3-on-surface transition-colors hover:bg-m3-surface-container-low"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">login</span>
              <span>Google</span>
            </button>
          ) : null}
          {oauthProviders.github ? (
            <button
              type="button"
              onClick={() => signIn("github")}
              aria-label="GitHub"
              className="flex items-center justify-center gap-sm rounded border border-m3-outline-variant bg-m3-surface py-md text-label-lg font-label-lg text-m3-on-surface transition-colors hover:bg-m3-surface-container-low"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">code</span>
              <span>GitHub</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
