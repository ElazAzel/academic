import { getServerSession } from "next-auth";
import type { RoleKey } from "@prisma/client";
import { authOptions } from "@/server/auth/options";
import { ApiError } from "@/lib/http";
import { assertPermission, type Permission } from "@/lib/auth/rbac";

export type AppSessionUser = {
  id: string;
  email: string;
  name?: string | null;
  roles: RoleKey[];
};

export async function getCurrentUser(): Promise<AppSessionUser | null> {
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

