"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSyncExternalStore, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/icon";
import { getDefaultRolePath } from "@/lib/auth/role-redirect";
import type { OAuthProviderFlags } from "@/server/auth/provider-flags";
import type { RoleKey } from "@/types/domain";

const REDIRECT_TARGET_RETRIES = 20;
const REDIRECT_TARGET_RETRY_DELAY_MS = 250;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ROLE_KEYS = new Set<RoleKey>([
  "admin",
  "super_curator",
  "curator",
  "instructor",
  "customer_observer",
  "student",
]);

function isRoleKey(value: unknown): value is RoleKey {
  return typeof value === "string" && ROLE_KEYS.has(value as RoleKey);
}

async function resolveRedirectPath() {
  for (let attempt = 0; attempt < REDIRECT_TARGET_RETRIES; attempt++) {
    const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
    const session = (await sessionResponse.json().catch(() => null)) as { user?: { roles?: unknown[] } } | null;
    const roles = Array.isArray(session?.user?.roles) ? session.user.roles.filter(isRoleKey) : [];
    if (roles.length > 0) {
      return getDefaultRolePath(roles);
    }
    if (attempt < REDIRECT_TARGET_RETRIES - 1) {
      await wait(REDIRECT_TARGET_RETRY_DELAY_MS);
    }
  }

  const targetResponse = await fetch("/api/v1/auth/redirect-target", { cache: "no-store" });
  const payload = (await targetResponse.json().catch(() => null)) as { data?: { path?: string } } | null;
  return payload?.data?.path ?? "/403";
}

export function LoginForm({ oauthProviders }: { oauthProviders: OAuthProviderFlags }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const hasOAuth = oauthProviders.google || oauthProviders.github;

  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

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
      const targetPath = await resolveRedirectPath();
      setPending(false);
      router.replace(targetPath);
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
          <Icon name="mail" size={20} className="pointer-events-none absolute left-sm top-1/2 -translate-y-1/2 text-m3-outline" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Введите ваш e-mail"
            className="w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest/90 py-[10px] pl-xxl pr-md text-body-md font-body-md text-m3-on-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.52)] placeholder:text-m3-outline transition-[background-color,border-color,box-shadow] focus:border-m3-primary focus:bg-m3-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-m3-primary/20"
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
          <Icon name="lock" size={20} className="pointer-events-none absolute left-sm top-1/2 -translate-y-1/2 text-m3-outline" />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Введите пароль"
            className="w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest/90 py-[10px] pl-xxl pr-md text-body-md font-body-md text-m3-on-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.52)] placeholder:text-m3-outline transition-[background-color,border-color,box-shadow] focus:border-m3-primary focus:bg-m3-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-m3-primary/20"
            onChange={() => setError("")}
          />
        </div>
      </div>

      {/* Error */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key={error}
            initial={{ opacity: 0, height: 0, scale: 0.95, x: 0 }}
            animate={{
              opacity: 1,
              height: "auto",
              scale: 1,
              x: [0, -10, 10, -8, 8, -4, 4, 0],
            }}
            exit={{ opacity: 0, height: 0, scale: 0.95, x: 0 }}
            transition={{
              duration: 0.3,
              x: { duration: 0.5, ease: "easeInOut" },
            }}
            className="overflow-hidden rounded-md bg-m3-error-container px-md py-sm text-body-sm font-body-sm text-m3-error"
            role="alert"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>

        {/* Submit */}
      <motion.button
        type="submit"
        disabled={pending || !hydrated}
        className="mt-sm flex w-full items-center justify-center gap-sm rounded-lg bg-m3-primary py-md text-label-lg font-label-lg text-m3-on-primary shadow-[0_10px_24px_rgba(22,63,130,0.22)] transition-[background-color,box-shadow] hover:bg-m3-primary-container hover:shadow-[0_14px_28px_rgba(22,63,130,0.26)] disabled:opacity-50"
        whileHover={!pending && hydrated ? { scale: 1.015 } : undefined}
        whileTap={!pending && hydrated ? { scale: 0.98 } : undefined}
        layout
      >
        <motion.span
          key={pending ? "pending" : "idle"}
          initial={{ opacity: 0, y: pending ? 8 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {pending ? "Входим..." : "Войти в систему"}
        </motion.span>
        <motion.span
          animate={pending ? { rotate: 360 } : { rotate: 0 }}
          transition={pending ? { duration: 1, ease: "linear", repeat: Infinity } : { duration: 0.3 }}
        >
          <Icon name={pending ? "progress_activity" : "arrow_forward"} size={20} />
        </motion.span>
      </motion.button>

      {/* OAuth */}
      {hasOAuth ? (
        <div className="mt-sm grid gap-2 sm:grid-cols-2">
          {oauthProviders.google ? (
            <motion.button
              type="button"
              onClick={() => signIn("google")}
              aria-label="Google"
              className="flex items-center justify-center gap-sm rounded-lg border border-m3-outline-variant bg-m3-surface py-md text-label-lg font-label-lg text-m3-on-surface transition-colors hover:bg-m3-surface-container-low"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon name="login" size={20} />
              <span>Google</span>
            </motion.button>
          ) : null}
          {oauthProviders.github ? (
            <motion.button
              type="button"
              onClick={() => signIn("github")}
              aria-label="GitHub"
              className="flex items-center justify-center gap-sm rounded-lg border border-m3-outline-variant bg-m3-surface py-md text-label-lg font-label-lg text-m3-on-surface transition-colors hover:bg-m3-surface-container-low"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon name="code" size={20} />
              <span>GitHub</span>
            </motion.button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
