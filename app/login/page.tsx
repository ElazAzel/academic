import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getEnabledOAuthProviders } from "@/server/auth/provider-flags";

export default function LoginPage() {
  const oauthProviders = getEnabledOAuthProviders();
  const hasOAuth = oauthProviders.google || oauthProviders.github;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Вход</CardTitle>
          <CardDescription>
            {hasOAuth ? "Используйте email/password или OAuth-провайдера академии." : "Используйте email/password для входа в академию."}
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
