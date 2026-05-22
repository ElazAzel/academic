import type { RoleKey } from "@prisma/client";
import { ApiError } from "@/lib/http";

export const permissions = [
  "users:read",
  "users:write",
  "roles:manage",
  "courses:read",
  "courses:write",
  "lessons:write",
  "enrollments:write",
  "progress:write",
  "quizzes:write",
  "assignments:review",
  "certificates:issue",
  "invites:manage",
  "analytics:read",
  "audit:read",
  "settings:manage",
  "notifications:write",
  "reports:read"
] as const;

export type Permission = (typeof permissions)[number];

export const rolePermissions: Record<RoleKey, Permission[]> = {
  admin: [...permissions],
  instructor: ["courses:read", "courses:write", "lessons:write", "quizzes:write", "progress:write", "analytics:read", "reports:read"],
  student: ["courses:read", "progress:write"],
  curator: ["courses:read", "assignments:review", "progress:write", "notifications:write", "reports:read"],
  super_curator: ["users:read", "users:write", "roles:manage", "courses:read", "assignments:review", "progress:write", "quizzes:write", "analytics:read", "notifications:write", "reports:read"],
  customer_observer: ["courses:read", "analytics:read", "reports:read"]
};

export function hasPermission(roles: RoleKey[], permission: Permission) {
  // Без ролей — нет прав (защита от неполных JWTs)
  if (roles.length === 0) return false;
  return roles.some((role) => rolePermissions[role]?.includes(permission));
}

export function assertPermission(roles: RoleKey[], permission: Permission) {
  if (!hasPermission(roles, permission)) {
    throw new ApiError("forbidden", "Недостаточно прав", 403);
  }
}
