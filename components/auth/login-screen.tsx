"use client";

import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import type { OAuthProviderFlags } from "@/server/auth/provider-flags";

export function LoginScreen({ oauthProviders }: { oauthProviders: OAuthProviderFlags }) {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-m3-background px-4 selection:bg-m3-primary/20 selection:text-m3-primary">
      <div className="flex w-full max-w-[420px] flex-col items-center">
        <div className="flex w-full flex-col gap-lg rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest p-lg shadow-m3-soft md:p-xl">
          <div className="flex flex-col items-center gap-sm border-b border-m3-outline-variant/20 pb-md text-center">
            <div className="mb-sm flex h-12 w-12 items-center justify-center rounded-lg border border-m3-outline-variant/50 bg-m3-surface-container">
              <span className="material-symbols-outlined text-[28px] text-m3-primary" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                school
              </span>
            </div>
            <h1 className="text-headline-lg-mobile font-headline-lg-mobile text-m3-primary md:text-headline-lg md:font-headline-lg">
              AI Strategic Academy
            </h1>
            <p className="text-body-md font-body-md text-m3-on-surface-variant">
              Закрытая образовательная платформа
            </p>
          </div>

          <LoginForm oauthProviders={oauthProviders} />
        </div>

        <footer className="mt-lg flex flex-wrap justify-center gap-x-md gap-y-xs text-body-sm font-body-sm text-m3-on-surface-variant/80">
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
