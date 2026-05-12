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
        <div className="relative z-10 flex items-center justify-center">
          <div className="relative h-72 w-72">
            <div className="animate-float-slow absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
            <div className="animate-float absolute left-8 top-6 h-20 w-20 rounded-2xl bg-white/5 blur-lg" />
            <div className="animate-float-delayed absolute bottom-12 right-6 h-16 w-16 rounded-full bg-white/8 blur-xl" />
            <div className="animate-pulse-glow absolute bottom-20 left-10 h-10 w-10 rounded-full bg-white/10 blur-md" />
            <div className="animate-float absolute right-12 top-16 h-8 w-8 rounded-lg bg-white/5 blur-md" style={{ animationDelay: "-2s" }} />
          </div>
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
