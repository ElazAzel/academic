type CohortActionResult = { success: boolean; error?: string };

export const CREATE_COHORT_ERROR = "Не удалось создать поток";
export const UPDATE_COHORT_ERROR = "Не удалось обновить поток";

const SAFE_COHORT_ERROR_MESSAGES = new Set([
  "Название и курс обязательны",
  "ID и название обязательны",
  "Внутренняя ошибка сервера",
]);

export function readCohortActionResultError(result: CohortActionResult, fallback: string) {
  return result.error && SAFE_COHORT_ERROR_MESSAGES.has(result.error) ? result.error : fallback;
}

export function getSafeCohortActionError(error: unknown, fallback: string) {
  if (error instanceof Error && SAFE_COHORT_ERROR_MESSAGES.has(error.message)) {
    return error.message;
  }

  return fallback;
}
