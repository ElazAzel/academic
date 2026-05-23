import { ApiError } from "@/lib/http";
import { assertPermission, type Permission } from "@/lib/auth/rbac";
import { isActiveUserStatus } from "@/lib/auth/user-status";
import type { AppSessionUser, RoleKey } from "@/types/domain";
export type { AppSessionUser };

function isDynamicServerUsageError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    error.digest === "DYNAMIC_SERVER_USAGE"
  );
}

async function revalidateSession(user: AppSessionUser): Promise<AppSessionUser | null> {
  if (typeof window !== "undefined") return user;

  try {
    const { getPrisma } = await import("@/lib/prisma");
    const prisma = getPrisma();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        status: true,
        roles: {
          select: { role: { select: { key: true } } },
        },
      },
    });

    if (!dbUser || !isActiveUserStatus(dbUser.status)) {
      return null;
    }

    const freshRoles = dbUser.roles.map((r) => r.role.key) as RoleKey[];

    return { ...user, roles: freshRoles };
  } catch (error) {
    // If DB query fails (timeout, cold start on Vercel, etc.),
    // fall back to JWT session roles instead of crashing the page
    console.error("[revalidateSession] Failed to fetch roles from DB:", error);
    return user;
  }
}

export async function getCurrentUser(): Promise<AppSessionUser | null> {
  if (typeof window !== "undefined") return null;

  try {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/server/auth/options");

    const session = await getServerSession(authOptions);
    const user = session?.user as AppSessionUser | undefined;
    if (!user?.id) {
      return null;
    }
    return revalidateSession(user);
  } catch (error) {
    if (isDynamicServerUsageError(error)) {
      throw error;
    }

    // If anything fails (import error, NextAuth crash, DB timeout),
    // return null so the page redirects to login instead of 500
    console.error("[getCurrentUser] Failed to get session:", error);
    return null;
  }
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
