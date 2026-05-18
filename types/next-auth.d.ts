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
    };
    requires2fa?: boolean;
  }

  interface User {
    roles?: RoleKey[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    roles?: RoleKey[];
    requires2fa?: boolean;
  }
}
