const DEFAULT_POPUP_ACTION_ERROR = "Не удалось отправить попап";

const CONTROLLED_POPUP_ERRORS = new Set([
  DEFAULT_POPUP_ACTION_ERROR,
  "Не удалось отправить уведомление",
  "Не удалось загрузить попапы",
  "Не удалось создать попап",
  "Ошибка создания",
  "Выберите хотя бы одного слушателя",
  "Введите заголовок",
  "Введите текст сообщения",
  "Название обязательно",
  "Текст сообщения обязателен",
  "Нужно указать целевые роли или конкретных пользователей",
  "Только администратор может отправлять попапы по ролям или потокам",
  "Вы можете создавать попапы только для своих слушателей",
  "Некорректные данные запроса",
  "Тело запроса должно быть JSON",
]);

export function getSafePopupActionError(error: unknown, fallback = DEFAULT_POPUP_ACTION_ERROR) {
  if (error instanceof Error && CONTROLLED_POPUP_ERRORS.has(error.message)) {
    return error.message;
  }

  return fallback;
}
