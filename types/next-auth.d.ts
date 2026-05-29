import type { RoleKey } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      roles: RoleKey[];
      authDeviceSessionId?: string;
    };
    requires2fa?: boolean;
    authDeviceSessionId?: string;
    authDeviceSessionRevoked?: boolean;
  }

  interface User {
    roles?: RoleKey[];
    loginIpAddress?: string | null;
    loginUserAgent?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    roles?: RoleKey[];
    requires2fa?: boolean;
    authDeviceSessionId?: string;
    authDeviceSessionStartedAt?: string;
    authDeviceSessionRevoked?: boolean;
  }
}
