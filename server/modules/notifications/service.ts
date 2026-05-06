import { getPrisma } from "@/lib/prisma";
import { toJsonValue } from "@/lib/json";

const prisma = getPrisma();

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
  | "curator_assigned";

const templates: Record<NotificationEvent, { title: string; body: string }> = {
  access_granted: { title: "Доступ выдан", body: "Вам открыт доступ к учебной программе." },
  course_opened: { title: "Курс открыт", body: "Можно начинать обучение." },
  new_lesson_available: { title: "Новый урок доступен", body: "Следующий урок уже открыт." },
  module_deadline_near: { title: "Скоро дедлайн", body: "Проверьте прогресс по модулю." },
  user_inactive: { title: "Нет активности", body: "Пора вернуться к обучению." },
  assignment_reviewed: { title: "Задание проверено", body: "Посмотрите комментарий куратора." },
  question_answered: { title: "Куратор ответил", body: "Ответ доступен в уроке." },
  live_session_soon: { title: "Скоро трансляция", body: "Не пропустите занятие." },
  certificate_available: { title: "Сертификат доступен", body: "Сертификат можно скачать в кабинете." },
  curator_assigned: { title: "Куратор назначен", body: "Теперь у вас есть ответственный куратор." }
};

export function renderNotificationTemplate(event: NotificationEvent, overrides?: Partial<{ title: string; body: string }>) {
  return { ...templates[event], ...overrides };
}

export async function createNotification(input: {
  userId: string;
  event: NotificationEvent;
  channel?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}) {
  const rendered = renderNotificationTemplate(input.event, { title: input.title, body: input.body });
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.event,
      channel: input.channel ?? "in_app",
      title: rendered.title,
      body: rendered.body,
      status: "SENT",
      data: toJsonValue(input.data ?? {})
    }
  });
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}
