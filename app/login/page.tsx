import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Вход</CardTitle>
          <CardDescription>Используйте email/password или OAuth-провайдера академии.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <div className="mt-5 flex justify-between text-sm text-muted-foreground">
            <Link href="/forgot-password">Забыли пароль?</Link>
            <Link href="/register">Регистрация</Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

