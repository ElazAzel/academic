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
  if (!user.authDeviceSessionId) return null;

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
        authDeviceSessions: {
          where: {
            id: user.authDeviceSessionId,
            revokedAt: null,
          },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!dbUser || !isActiveUserStatus(dbUser.status)) {
      return null;
    }

    if (dbUser.authDeviceSessions.length === 0) {
      return null;
    }

    const freshRoles = dbUser.roles.map((r) => r.role.key) as RoleKey[];

    return { ...user, roles: freshRoles };
  } catch (error) {
    // Device-session control is a server-side security check; if the DB cannot
    // confirm it, fail closed and require a fresh login.
    console.error("[revalidateSession] Failed to validate session from DB:", error);
    return null;
  }
}

export async function getCurrentUser(): Promise<AppSessionUser | null> {
  if (typeof window !== "undefined") return null;

  try {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/server/auth/options");

    const session = await getServerSession(authOptions);
    if (session?.authDeviceSessionRevoked) {
      return null;
    }

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
