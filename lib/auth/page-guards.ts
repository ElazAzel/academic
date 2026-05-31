import { redirect } from "next/navigation";
import type { RoleKey } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { AUTH_ROUTES, FORBIDDEN_ROUTE } from "@/lib/constants";
import { ApiError } from "@/lib/http";

export async function requireRolePage(allowedRoles: RoleKey[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(AUTH_ROUTES.LOGIN);
  }

  if (!allowedRoles.some((role) => user.roles.includes(role))) {
    redirect(FORBIDDEN_ROUTE);
  }

  return user;
}

export async function requireRole(allowedRoles: RoleKey[]) {
  const user = await getCurrentUser();

  if (!user) {
    throw new ApiError("unauthorized", "Необходима авторизация", 401);
  }

  if (!allowedRoles.some((role) => user.roles.includes(role))) {
    throw new ApiError("forbidden", "Недостаточно прав", 403);
  }

  return user;
}
