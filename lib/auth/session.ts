import { ApiError } from "@/lib/http";
import { assertPermission, type Permission } from "@/lib/auth/rbac";
export type { AppSessionUser } from "@/types/domain";

export async function getCurrentUser(): Promise<AppSessionUser | null> {
  if (typeof window !== "undefined") return null;
  
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/server/auth/options");
  
  const session = await getServerSession(authOptions);
  const user = session?.user as AppSessionUser | undefined;
  return user ?? null;
}

export async function requireUser(permission?: Permission) {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError("unauthorized", "Требуется вход", 401);
  }
  if (permission) {
    assertPermission(user.roles, permission);
  }
  return user;
}

