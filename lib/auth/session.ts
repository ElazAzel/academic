import { ApiError } from "@/lib/http";
import { assertPermission, type Permission } from "@/lib/auth/rbac";
import { isActiveUserStatus } from "@/lib/auth/user-status";
import type { AppSessionUser, RoleKey } from "@/types/domain";
export type { AppSessionUser };

async function revalidateSession(user: AppSessionUser): Promise<AppSessionUser> {
  if (typeof window !== "undefined") return user;

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
    throw new ApiError("unauthorized", "Доступ заблокирован: пользователь деактивирован", 401);
  }

  const freshRoles = dbUser.roles.map((r) => r.role.key) as RoleKey[];

  // Возвращаем пользователя со свежими ролями
  return { ...user, roles: freshRoles };
}

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

  // C4: Перепроверяем статус и роли пользователя в БД при каждом запросе
  const freshUser = await revalidateSession(user);

  if (permission) {
    assertPermission(freshUser.roles, permission);
  }
  return freshUser;
}
