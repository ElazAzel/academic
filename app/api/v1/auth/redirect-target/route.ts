import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/http";
import { getDefaultRolePath } from "@/lib/auth/role-redirect";
import type { RoleKey } from "@/types/domain";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    const roles = token?.roles as RoleKey[] | undefined;
    if (!roles || roles.length === 0) {
      // Session may not be propagated yet after login — return default path
      return ok({ path: "/student" });
    }
    return ok({ path: getDefaultRolePath(roles) });
  } catch (error) {
    return errorResponse(error);
  }
}
