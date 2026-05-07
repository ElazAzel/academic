import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/auth/login-screen";
import { getCurrentUser } from "@/lib/auth/session";
import { getDefaultRolePath } from "@/lib/auth/role-redirect";
import { getEnabledOAuthProviders } from "@/server/auth/provider-flags";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
<<<<<<< HEAD
=======

>>>>>>> e63fa65c366d6aebc4d97c18216ba9069a19a7c2
  if (user) {
    redirect(getDefaultRolePath(user.roles));
  }

  return <LoginScreen oauthProviders={getEnabledOAuthProviders()} />;
}
