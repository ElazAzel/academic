import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Согласие на обработку данных",
  description: "Ознакомьтесь с политикой обработки персональных данных.",
};


export const dynamic = "force-dynamic";

export default function ConsentPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold text-m3-on-surface">Согласие</h1>
          <p className="text-body-md leading-relaxed text-m3-on-surface-variant">
            AI Strategic Academy фиксирует согласие пользователя после входа в закрытый кабинет.
            Перед продолжением обучения ознакомьтесь с юридическими документами платформы.
          </p>
        </div>

        <section className="space-y-3 border-y border-m3-outline-variant py-6">
          <h2 className="text-title-lg font-semibold text-m3-on-surface">Документы</h2>
          <div className="grid gap-2 text-body-md">
            <Link href="/privacy" className="text-m3-primary underline-offset-4 hover:underline">
              Политика конфиденциальности
            </Link>
            <Link href="/terms" className="text-m3-primary underline-offset-4 hover:underline">
              Пользовательское соглашение
            </Link>
            <Link href="/docs/cookie-notice" className="text-m3-primary underline-offset-4 hover:underline">
              Уведомление об использовании cookie
            </Link>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href={AUTH_ROUTES.LOGIN}>Войти</Link>
          </Button>
          <p className="text-body-sm text-m3-on-surface-variant">
            Подтверждение согласия доступно только для выданного аккаунта.
          </p>
        </div>
      </main>
    </div>
  );
}
