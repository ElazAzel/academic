import { MailQuestion, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AUTH_ROUTES } from "@/lib/constants";
import { getRuntimeBranding } from "@/server/modules/branding/service";

export const metadata = {
  title: "Восстановление пароля",
  description: "Восстановите доступ к своей учётной записи.",
};

export const dynamic = "force-dynamic";


export default async function ForgotPasswordPage() {
  const branding = await getRuntimeBranding();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <MailQuestion className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Восстановление пароля</h1>
        <p className="text-muted-foreground">
          Самостоятельный сброс пароля отключён. Для восстановления доступа напишите на почту{" "}
          <a href={`mailto:${branding.supportEmail}`} className="font-medium text-primary underline underline-offset-4">
            {branding.supportEmail}
          </a>
          , указав свои ФИО. Мы поможем восстановить доступ.
        </p>
        <div className="pt-2 text-center text-sm text-muted-foreground">
          <Link href={AUTH_ROUTES.LOGIN} className="inline-flex items-center gap-1 text-primary hover:underline">
            <ArrowLeft className="h-3 w-3" />
            Вернуться ко входу
          </Link>
        </div>
      </div>
    </main>
  );
}
