import type { RoleKey } from "@/types/domain";

/**
 * Преобразует ID пользователя (CUID) в консистентный номер.
 * Используется для генерации "Пользователь N" вместо реального имени.
 */
function userIdToNumber(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Приводим к положительному числу 1–99999
  return (Math.abs(hash) % 99999) + 1;
}

/**
 * Маскирует реальное имя пользователя.
 *
 * Правила:
 * - Админ всегда видит реальное имя
 * - Свой профиль — своё имя
 * - Для всех остальных: "Пользователь N" (N консистентно от ID)
 *
 * @param realName - Настоящее имя
 * @param viewerRoles - Роли смотрящего
 * @param viewerId - ID смотрящего (для проверки "свой/чужой")
 * @param ownerId - ID владельца имени
 */
export function maskName(
  realName: string | null | undefined,
  viewerRoles: RoleKey[],
  viewerId?: string,
  ownerId?: string,
): string {
  // Админ видит реальные имена
  if (viewerRoles.includes("admin")) {
    return realName ?? "Пользователь";
  }

  // Свой профиль — своё имя
  if (viewerId && ownerId && viewerId === ownerId) {
    return realName ?? "Пользователь";
  }

  // Для всех остальных — "Пользователь N"
  if (ownerId) {
    return `Пользователь ${userIdToNumber(ownerId)}`;
  }

  return "Пользователь";
}

/**
 * Имя для отображения в чате.
 * Для не-админов чужие имена → "Пользователь N".
 */
export function maskChatName(
  senderName: string | null | undefined,
  senderId: string,
  viewerRoles: RoleKey[],
  viewerId: string,
): string {
  // Админ видит реальные имена
  if (viewerRoles.includes("admin")) {
    return senderName ?? "Пользователь";
  }

  // Свои сообщения
  if (viewerId === senderId) {
    return "Вы";
  }

  // Чужие сообщения — "Пользователь N"
  return `Пользователь ${userIdToNumber(senderId)}`;
}

/**
 * Возвращает displayName для уведомлений (всегда маскирован для не-админов).
 */
export function deriveDisplayName(realName: string | null | undefined, userId?: string): string {
  if (userId) {
    return `Пользователь ${userIdToNumber(userId)}`;
  }
  return "Пользователь";
}
