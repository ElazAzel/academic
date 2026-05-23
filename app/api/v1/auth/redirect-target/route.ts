import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/http";
import { getDefaultRolePath } from "@/lib/auth/role-redirect";
import { isActiveUserStatus } from "@/lib/auth/user-status";
import { getPrisma } from "@/lib/prisma";
import type { RoleKey } from "@/types/domain";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const roles = token?.roles as RoleKey[] | undefined;
    if (roles && roles.length > 0) {
      return ok({ path: getDefaultRolePath(roles) });
    }

    const email = typeof token?.email === "string" ? token.email.toLowerCase().trim() : "";
    if (email) {
      const user = await getPrisma().user.findUnique({
        where: { email },
        select: {
          status: true,
          roles: { select: { role: { select: { key: true } } } },
        },
      });

      if (user && isActiveUserStatus(user.status)) {
        const dbRoles = user.roles.map((entry) => entry.role.key) as RoleKey[];
        if (dbRoles.length > 0) {
          return ok({ path: getDefaultRolePath(dbRoles) });
        }
      }
    }

    return ok({ path: "/403" });
  } catch (error) {
    return errorResponse(error);
  }
}
