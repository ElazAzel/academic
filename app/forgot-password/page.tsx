import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Восстановление пароля</CardTitle>
          <CardDescription>Введите email, и платформа создаст безопасный reset token.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <Input name="email" type="email" placeholder="email@example.com" required />
            <Button className="w-full" type="submit">Отправить ссылку</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

