import { redirect } from "next/navigation";
import type { RoleKey } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { AUTH_ROUTES, FORBIDDEN_ROUTE } from "@/lib/constants";

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
    throw new Error("Необходима авторизация");
  }

  if (!allowedRoles.some((role) => user.roles.includes(role))) {
    throw new Error("Недостаточно прав");
  }

  return user;
}
