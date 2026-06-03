const DEFAULT_DISCUSSION_ACTION_ERROR = "Не удалось отправить сообщение";

const CONTROLLED_DISCUSSION_ERRORS = new Set([
  DEFAULT_DISCUSSION_ACTION_ERROR,
  "Не удалось удалить пост",
  "Не удалось загрузить обсуждение",
  "Ошибка при отправке",
  "Родительский пост не найден",
  "Некорректные данные запроса",
  "Тело запроса должно быть JSON",
  "Урок не найден",
  "Пост не найден",
  "Нет прав на удаление",
  "Недостаточно прав",
  "Требуется вход",
  "Внутренняя ошибка сервера",
]);

export function getSafeDiscussionActionError(error: unknown, fallback = DEFAULT_DISCUSSION_ACTION_ERROR) {
  if (error instanceof Error && CONTROLLED_DISCUSSION_ERRORS.has(error.message)) {
    return error.message;
  }

  return fallback;
}
