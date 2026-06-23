import { NOTIFICATION_CHANNELS } from "@/lib/constants";

// ── Event type ────────────────────────────────────────────────────────────────

export type NotificationEvent =
  | "access_granted"
  | "course_opened"
  | "new_lesson_available"
  | "module_deadline_near"
  | "user_inactive"
  | "assignment_reviewed"
  | "question_answered"
  | "live_session_soon"
  | "certificate_available"
  | "certificate_revoked"
  | "curator_assigned"
  | "student_assigned"
  | "question_received"
  | "question_forwarded"
  | "password_changed"
  | "device_limit_exceeded"
  | "profile_updated"
  | "popup"
  | "new_message"
  | "block_completed"
  | "module_completed"
  | "curator_response_reminder";

// ── Templates ─────────────────────────────────────────────────────────────────

const templates: Record<NotificationEvent, { title: string; body: string }> = {
  device_limit_exceeded: {
    title: "Ограничение входа по устройствам",
    body: "Выполнен вход на третьем устройстве. Один из предыдущих сеансов завершен. Не передавайте логин и пароль третьим лицам.",
  },
  access_granted: { title: "Доступ выдан", body: "Вам открыт доступ к учебной программе." },
  course_opened: { title: "Курс открыт", body: "Можно начинать обучение." },
  new_lesson_available: { title: "Новый урок доступен", body: "Следующий урок уже открыт." },
  module_deadline_near: { title: "Скоро дедлайн", body: "Проверьте прогресс по модулю." },
  user_inactive: { title: "Нет активности", body: "Пора вернуться к обучению." },
  assignment_reviewed: { title: "Задание проверено", body: "Посмотрите комментарий куратора." },
  question_answered: { title: "Куратор ответил", body: "Ответ доступен в уроке." },
  live_session_soon: { title: "Скоро трансляция", body: "Не пропустите занятие." },
  certificate_available: { title: "Сертификат доступен", body: "Сертификат можно скачать в кабинете." },
  certificate_revoked: { title: "Сертификат отозван", body: "Сертификат больше не считается действительным." },
  curator_assigned: { title: "Куратор назначен", body: "Теперь у вас есть ответственный куратор." },
  student_assigned: { title: "Слушатель назначен", body: "Вам назначен слушатель для сопровождения." },
  question_received: { title: "Новый вопрос", body: "Слушатель задал вопрос по уроку." },
  question_forwarded: { title: "Вопрос переадресован", body: "Ваш вопрос передан инструктору." },
  password_changed: { title: "Пароль изменён", body: "Пароль от вашей учётной записи успешно изменён." },
  profile_updated: { title: "Профиль обновлён", body: "Данные вашего профиля успешно обновлены." },
  popup: { title: "Важное сообщение", body: "У вас новое сообщение от администрации." },
  new_message: { title: "Новое сообщение", body: "У вас новое сообщение в чате." },
  block_completed: { title: "Блок пройден", body: "Вы завершили блок обучения." },
  module_completed: { title: "Модуль пройден", body: "Поздравляем с завершением модуля!" },
  curator_response_reminder: { title: "Напоминание: ожидает ответа", body: "Слушатель ждёт вашего ответа уже более 2 часов." },
};

export function renderNotificationTemplate(event: NotificationEvent, overrides?: Partial<{ title: string; body: string }>) {
  return { ...templates[event], ...overrides };
}

/**
 * Валидирует event-строку как NotificationEvent, возвращая её же или
 * "profile_updated" как fallback, если событие не найдено в шаблонах.
 */
export function resolveNotificationEvent(event: string): NotificationEvent {
  return (Object.keys(templates).includes(event) ? event : "profile_updated") as NotificationEvent;
}

// ── Channel helpers ───────────────────────────────────────────────────────────

type NotificationDeliveryChannel = (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];

const deliveryChannels = new Set<string>(Object.values(NOTIFICATION_CHANNELS));

export const securityNotificationEvents = new Set([
  "device_limit_exceeded",
  "password_changed",
  "profile_updated",
  "certificate_revoked",
]);

export function normalizeNotificationChannel(channel?: string): NotificationDeliveryChannel {
  if (channel && deliveryChannels.has(channel)) {
    return channel as NotificationDeliveryChannel;
  }
  return NOTIFICATION_CHANNELS.IN_APP;
}
