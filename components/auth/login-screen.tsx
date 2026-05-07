import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OAuthProviderFlags } from "@/server/auth/provider-flags";

export function LoginScreen({ oauthProviders }: { oauthProviders: OAuthProviderFlags }) {
  const hasOAuth = oauthProviders.google || oauthProviders.github;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Вход в академию</CardTitle>
          <CardDescription>
            {hasOAuth
              ? "Используйте выданный логин и пароль или подключенный OAuth-провайдер."
              : "Используйте логин и пароль, которые выдал администратор академии."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm oauthProviders={oauthProviders} />
          <div className="mt-5 flex justify-center text-sm text-muted-foreground">
            <Link href="/forgot-password">Забыли пароль?</Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
