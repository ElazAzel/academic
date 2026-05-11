import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import type { OAuthProviderFlags } from "@/server/auth/provider-flags";

export function LoginScreen({ oauthProviders }: { oauthProviders: OAuthProviderFlags }) {
  return (
    <main className="relative flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-indigo-900 p-12 text-white lg:flex">
        <div className="relative z-10 flex items-center gap-3 text-xl font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <GraduationCap className="h-6 w-6" />
          </span>
          AI Strategic Academy
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">Закрытая LMS<br />для AI-стратегии</h1>
          <p className="mt-4 text-lg text-white/70">
            Потоки, кураторы, отчётность и сертификация — всё в одной платформе.
          </p>
        </div>
        <div className="relative z-10 text-sm text-white/50">
          &copy; {new Date().getFullYear()} AI Strategic Academy
        </div>
        {/* Decorative circles */}
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute bottom-40 -left-10 h-48 w-48 rounded-full bg-white/[0.03]" />
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <GraduationCap className="h-6 w-6" />
            </span>
            <span className="text-xl font-semibold">AI Strategic Academy</span>
          </div>

          <h1 className="text-2xl font-bold">Вход в академию</h1>
          <p className="mt-1 mb-8 text-sm text-muted-foreground">
            Используйте логин и пароль, выданные администратором.
          </p>

          <LoginForm oauthProviders={oauthProviders} />

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/forgot-password" className="transition-colors hover:text-foreground">
              Забыли пароль?
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
