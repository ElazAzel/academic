"use client";

import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import type { OAuthProviderFlags } from "@/server/auth/provider-flags";

export function LoginScreen({
  oauthProviders,
  reason,
}: {
  oauthProviders: OAuthProviderFlags;
  reason?: "device-limit";
}) {
  return (
    <main className="academy-login-shell relative flex min-h-screen w-full flex-col items-center justify-center px-4 py-8 selection:bg-m3-primary/20 selection:text-m3-primary">
      <div className="flex w-full max-w-[460px] flex-col items-center">
        <div className="academy-login-panel flex w-full flex-col gap-lg rounded-lg p-lg md:p-xl">
          <div className="flex flex-col items-center gap-sm border-b border-m3-outline-variant/25 pb-lg text-center">
            <span className="rounded-full border border-m3-primary/20 bg-m3-primary-fixed/45 px-3 py-1 text-body-sm font-semibold text-m3-primary">
              закрытый вход
            </span>
            <div className="academy-brand-mark mb-sm flex h-14 w-14 items-center justify-center rounded-lg text-white">
              <span className="material-symbols-outlined text-[28px] text-white" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                school
              </span>
            </div>
            <h1 className="text-headline-lg-mobile font-semibold text-m3-primary md:text-headline-lg">
              AI Strategic Academy
            </h1>
            <p className="text-body-md font-body-md text-m3-on-surface-variant">
              Закрытая образовательная платформа
            </p>
          </div>

          {reason === "device-limit" ? (
            <div
              className="rounded-lg border border-m3-error/30 bg-m3-error-container/70 px-md py-sm text-body-sm font-body-sm text-m3-error shadow-[0_8px_18px_rgba(186,26,26,0.08)]"
              role="alert"
            >
              Сеанс завершен: под этой учетной записью выполнен вход на третьем устройстве. Доступ разрешен максимум с двух устройств; не передавайте логин и пароль третьим лицам.
            </div>
          ) : null}

          <LoginForm oauthProviders={oauthProviders} />
        </div>

        <footer className="mt-lg flex flex-wrap justify-center gap-x-md gap-y-xs rounded-lg border border-m3-outline-variant/45 bg-m3-surface-container-lowest/70 px-4 py-3 text-body-sm font-body-sm text-m3-on-surface-variant/80 backdrop-blur">
          <Link href="/privacy" className="transition-colors hover:text-m3-primary hover:underline">Политика конфиденциальности</Link>
          <span className="hidden text-m3-outline-variant md:inline">•</span>
          <Link href="/terms" className="transition-colors hover:text-m3-primary hover:underline">Условия использования</Link>
          <span className="hidden text-m3-outline-variant md:inline">•</span>
          <Link href="/docs/cookie-notice" className="transition-colors hover:text-m3-primary hover:underline">Файлы Cookie</Link>
        </footer>
      </div>
    </main>
  );
}
