import type { RoleKey } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      roles: RoleKey[];
    };
  }

  interface User {
    roles?: RoleKey[];
  }
}

