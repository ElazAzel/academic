import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/auth/login-screen";
import { getCurrentUser } from "@/lib/auth/session";
import { getDefaultRolePath } from "@/lib/auth/role-redirect";
import { getEnabledOAuthProviders } from "@/server/auth/provider-flags";

export const metadata = {
  title: "Вход — AI Strategic Academy",
  description: "Войдите в свою учётную запись.",
};


export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ reason?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const user = await getCurrentUser();
  if (user) {
    redirect(getDefaultRolePath(user.roles));
  }

  return (
    <LoginScreen
      oauthProviders={getEnabledOAuthProviders()}
      reason={resolvedSearchParams?.reason === "device-limit" ? "device-limit" : undefined}
    />
  );
}
