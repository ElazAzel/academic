import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Регистрация</CardTitle>
          <CardDescription>По умолчанию создаётся роль слушателя. Доступ к курсам назначает академия.</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <p className="mt-5 text-sm text-muted-foreground">
            Уже есть аккаунт? <Link className="font-medium text-primary" href="/login">Войти</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

