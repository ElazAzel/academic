type UserActionResult = { success: boolean; error?: string };

export const UPDATE_USER_ERROR = "Не удалось обновить пользователя";
export const CREATE_USER_ERROR = "Не удалось создать пользователя";
export const DELETE_USER_ERROR = "Не удалось деактивировать пользователя";

const SAFE_USER_ERROR_MESSAGES = new Set([
  "Email обязателен",
  "ID пользователя обязателен",
  "Пользователь не найден",
  "Внутренняя ошибка сервера",
]);

export function readUserActionResultError(result: UserActionResult, fallback: string) {
  return result.error && SAFE_USER_ERROR_MESSAGES.has(result.error) ? result.error : fallback;
}

export function getSafeUserActionError(error: unknown, fallback: string) {
  if (error instanceof Error && SAFE_USER_ERROR_MESSAGES.has(error.message)) {
    return error.message;
  }

  return fallback;
}
