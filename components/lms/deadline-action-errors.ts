const DEADLINE_ACTION_ERROR = "Не удалось сохранить дедлайны";

const CONTROLLED_DEADLINE_ERRORS = new Set([
  DEADLINE_ACTION_ERROR,
  "Не удалось загрузить дедлайны",
  "Не удалось загрузить дедлайны потока",
  "Нет дедлайнов для сохранения",
  "Ошибка сохранения",
  "Некорректные данные запроса",
  "Тело запроса должно быть JSON",
  "Укажите ровно одну цель дедлайна",
]);

export function getSafeDeadlineActionError(error: unknown) {
  if (error instanceof Error && CONTROLLED_DEADLINE_ERRORS.has(error.message)) {
    return error.message;
  }

  return DEADLINE_ACTION_ERROR;
}
