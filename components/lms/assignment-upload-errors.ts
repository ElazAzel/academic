export const ASSIGNMENT_FILE_UPLOAD_ERROR = "Не удалось загрузить файл задания";

const SAFE_ASSIGNMENT_UPLOAD_ERROR_MESSAGES = new Set([
  "Недопустимый тип файла",
  "Недопустимый ключ хранилища",
  "Не указаны имя файла или тип содержимого",
  "Некорректный ответ сервера загрузки",
  "Ошибка при загрузке файла",
  "Ошибка при подготовке загрузки",
  "Не удалось загрузить файл",
]);

export function getSafeAssignmentUploadError(error: unknown) {
  if (error instanceof Error && SAFE_ASSIGNMENT_UPLOAD_ERROR_MESSAGES.has(error.message)) {
    return error.message;
  }

  return ASSIGNMENT_FILE_UPLOAD_ERROR;
}
