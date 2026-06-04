import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/lib/constants";
import { getRuntimeBranding } from "@/server/modules/branding/service";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getRuntimeBranding();
  return {
    title: `Регистрация — ${branding.name}`,
    description: "Создайте учётную запись для доступа к обучению.",
  };
}


export default async function RegisterPage() {
  const branding = await getRuntimeBranding();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-semibold text-m3-on-surface">Регистрация закрыта</h1>
          <CardDescription>
            {branding.name} работает по выданным аккаунтам. Логин и пароль выдаёт администратор академии.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Если вы участник потока, используйте полученные учётные данные на странице входа.
          </p>
          <Button asChild className="w-full">
            <Link href={AUTH_ROUTES.LOGIN}>Перейти ко входу</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
