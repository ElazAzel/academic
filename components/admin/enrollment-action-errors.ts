type EnrollmentActionResult = { success: boolean; error?: string };

export const ENROLL_STUDENT_ERROR = "Не удалось зачислить слушателя";
export const DELETE_ENROLLMENT_ERROR = "Не удалось удалить зачисление";

const SAFE_ENROLLMENT_ERROR_MESSAGES = new Set([
  "ID студента обязателен",
  "ID курса обязателен",
  "Некорректные данные формы",
  "Для назначения куратора необходимо выбрать поток (когорту)",
  "Внутренняя ошибка сервера",
]);

export function readEnrollmentActionResultError(result: EnrollmentActionResult, fallback: string) {
  return result.error && SAFE_ENROLLMENT_ERROR_MESSAGES.has(result.error) ? result.error : fallback;
}

export function getSafeEnrollmentActionError(error: unknown, fallback: string) {
  if (error instanceof Error && SAFE_ENROLLMENT_ERROR_MESSAGES.has(error.message)) {
    return error.message;
  }

  return fallback;
}
