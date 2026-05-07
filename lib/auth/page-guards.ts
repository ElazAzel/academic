import { redirect } from "next/navigation";
import type { RoleKey } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";

export async function requireRolePage(allowedRoles: RoleKey[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!allowedRoles.some((role) => user.roles.includes(role))) {
    redirect("/403");
  }

  return user;
}
