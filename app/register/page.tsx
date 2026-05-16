import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/lib/constants";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Регистрация закрыта</CardTitle>
          <CardDescription>
            AI Strategic Academy работает по выданным аккаунтам. Логин и пароль выдаёт администратор академии.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Если вы участник потока, используйте полученные credentials на странице входа.
          </p>
          <Button asChild className="w-full">
            <Link href={AUTH_ROUTES.LOGIN}>Перейти ко входу</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
