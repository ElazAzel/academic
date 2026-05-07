import type { RoleKey } from "@prisma/client";

export const ROLE_HOME_PATH: Record<RoleKey, string> = {
  admin: "/admin",
  super_curator: "/super-curator",
  curator: "/curator",
  instructor: "/instructor",
  customer_observer: "/customer-observer",
  student: "/student"
};

const ROLE_PRIORITY: RoleKey[] = [
  "admin",
  "super_curator",
  "curator",
  "instructor",
  "customer_observer",
  "student"
];

export function getDefaultRolePath(roles: RoleKey[]) {
  const primaryRole = ROLE_PRIORITY.find((role) => roles.includes(role));
  return primaryRole ? ROLE_HOME_PATH[primaryRole] : "/403";
}
