type SuperCuratorActionResult = { success: boolean; error?: string };

export const ADD_STUDENT_TO_COHORT_ERROR = "Не удалось добавить участника в поток";
export const ADD_CURATOR_ERROR = "Не удалось добавить куратора";
export const ASSIGN_CURATOR_ERROR = "Не удалось назначить куратора";
export const LOAD_RISK_STUDENTS_ERROR = "Не удалось загрузить список слушателей";
export const CREATE_RISK_ERROR = "Не удалось создать риск";
export const RESOLVE_RISK_ERROR = "Не удалось закрыть риск";

const SAFE_SUPER_CURATOR_ERROR_MESSAGES = new Set([
  "Все поля обязательны",
  "Пользователь с таким email не найден",
  "Произошла ошибка при добавлении студента",
  "Email обязателен",
  "Роль куратора не найдена",
  "Произошла ошибка при добавлении куратора",
  "Студент, куратор и поток обязательны",
  "Выбранный пользователь не является куратором",
  "Слушатель не зачислен в выбранный поток",
  "Поток вне зоны ответственности супер-куратора",
  "Куратор вне зоны ответственности супер-куратора",
  "Слушатель закреплен за другой зоной ответственности",
  "Слушатель и тип риска обязательны",
  "Слушатель вне зоны ответственности супер-куратора",
  "Произошла ошибка при создании риска",
  "ID флага обязателен",
  "Ошибка валидации",
  "Риск не найден",
  "Риск вне зоны ответственности супер-куратора",
  "Произошла ошибка при разрешении риска",
  "Внутренняя ошибка сервера",
]);

export function readSuperCuratorActionResultError(result: SuperCuratorActionResult, fallback: string) {
  return result.error && SAFE_SUPER_CURATOR_ERROR_MESSAGES.has(result.error) ? result.error : fallback;
}

export function getSafeSuperCuratorActionError(error: unknown, fallback: string) {
  if (error instanceof Error && SAFE_SUPER_CURATOR_ERROR_MESSAGES.has(error.message)) {
    return error.message;
  }

  return fallback;
}
