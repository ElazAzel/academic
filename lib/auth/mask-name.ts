import type { RoleKey } from "@/types/domain";

/**
 * Converts a user id into a stable number for non-chat anonymized areas.
 */
function userIdToNumber(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return (Math.abs(hash) % 99999) + 1;
}

/**
 * General anonymization helper for places where real names should be hidden.
 * Chat has separate role-aware display rules below.
 */
export function maskName(
  realName: string | null | undefined,
  viewerRoles: RoleKey[],
  viewerId?: string,
  ownerId?: string,
): string {
  if (viewerRoles.includes("admin")) {
    return realName ?? "Пользователь";
  }

  if (viewerId && ownerId && viewerId === ownerId) {
    return realName ?? "Пользователь";
  }

  if (ownerId) {
    return `Пользователь ${userIdToNumber(ownerId)}`;
  }

  return "Пользователь";
}

function cleanDisplayName(realName: string | null | undefined) {
  const name = realName?.trim();
  return name && name.length > 0 ? name : null;
}

function hasRole(roles: RoleKey[], role: RoleKey) {
  return roles.includes(role);
}

function withRolePrefix(prefix: string, realName: string | null | undefined) {
  const name = cleanDisplayName(realName);
  if (!name) return prefix;
  return name.toLowerCase().startsWith(prefix.toLowerCase()) ? name : `${prefix} ${name}`;
}

function formatChatDisplayName(realName: string | null | undefined, roles: RoleKey[]) {
  if (hasRole(roles, "curator")) return withRolePrefix("Куратор", realName);
  if (hasRole(roles, "super_curator")) return withRolePrefix("Супер-куратор", realName);
  if (hasRole(roles, "instructor")) return withRolePrefix("Преподаватель", realName);
  if (hasRole(roles, "admin")) return withRolePrefix("Администратор", realName);
  if (hasRole(roles, "student")) return cleanDisplayName(realName) ?? "Слушатель";
  return cleanDisplayName(realName) ?? "Пользователь";
}

/**
 * Role-aware chat display name.
 *
 * Rules:
 * - own messages are shown as "Вы";
 * - curator messages are shown as "Куратор <name>";
 * - student messages use the anonymized student format for non-admins: "Слушатель #XXXXX";
 * - no id-derived "Пользователь N" aliases are used in chat.
 */
export function maskChatName(
  senderName: string | null | undefined,
  senderId: string,
  viewerRoles: RoleKey[],
  viewerId: string,
  senderRoles: RoleKey[] = [],
): string {
  if (viewerId === senderId) {
    return "Вы";
  }

  const isSenderStudent = senderRoles.includes("student");
  if (isSenderStudent && !viewerRoles.includes("admin")) {
    return `Слушатель #${senderId.slice(-5).toUpperCase()}`;
  }

  return formatChatDisplayName(senderName, senderRoles.length > 0 ? senderRoles : viewerRoles);
}

/**
 * Display name for chat notifications.
 */
export function deriveDisplayName(realName: string | null | undefined, userId?: string, roles: RoleKey[] = []): string {
  if (roles.includes("student") && userId) {
    return `Слушатель #${userId.slice(-5).toUpperCase()}`;
  }
  return formatChatDisplayName(realName, roles);
}
