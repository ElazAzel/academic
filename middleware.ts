import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isPublicRoute,
  getRouteRoles,
  getDefaultRolePath,
} from "@/lib/auth/middleware-guards";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicRoute(pathname)) {
    if (pathname === "/login") {
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (token?.roles) {
        const roles = token.roles as string[];
        const homePath = getDefaultRolePath(roles);
        if (homePath !== "/403") {
          return NextResponse.redirect(new URL(homePath, req.url));
        }
      }
    }
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const roles = (token.roles as string[]) ?? [];
  const allowedRoles = getRouteRoles(pathname);

  if (allowedRoles && !allowedRoles.some((r) => roles.includes(r))) {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets).*)"],
};
