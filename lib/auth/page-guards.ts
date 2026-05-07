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
<<<<<<< HEAD
=======
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
>>>>>>> e63fa65c366d6aebc4d97c18216ba9069a19a7c2
