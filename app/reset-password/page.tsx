import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AUTH_ROUTES } from "@/lib/constants";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Новый пароль</CardTitle>
          <CardDescription>Введите токен из письма и задайте новый пароль длиной не менее 10 символов.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm token={token} />
          <p className="mt-5 text-sm text-muted-foreground">
            Уже обновили пароль? <Link className="font-medium text-primary" href={AUTH_ROUTES.LOGIN}>Войти</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

