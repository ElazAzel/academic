import Link from "next/link";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AUTH_ROUTES } from "@/lib/constants";

export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Подтверждение email</CardTitle>
          <CardDescription>Подтвердите email по токену из письма, чтобы завершить настройку аккаунта.</CardDescription>
        </CardHeader>
        <CardContent>
          <VerifyEmailForm token={token} />
          <p className="mt-5 text-sm text-muted-foreground">
            Email уже подтверждён? <Link className="font-medium text-primary" href={AUTH_ROUTES.LOGIN}>Войти</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

