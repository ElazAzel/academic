import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AUTH_ROUTES } from "@/lib/constants";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Восстановление пароля</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ForgotPasswordForm />
          <div className="text-center text-sm text-muted-foreground">
            <Link href={AUTH_ROUTES.LOGIN} className="inline-flex items-center gap-1 text-primary hover:underline">
              <ArrowLeft className="h-3 w-3" />
              Вернуться ко входу
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
