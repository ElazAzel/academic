import { getPrisma } from "@/lib/prisma";
import { toJsonValue } from "@/lib/json";
import { env } from "@/lib/env";
import { getUserNotificationPreferences } from "@/server/modules/notifications/preferences";

const prisma = getPrisma();

let nodemailerTransporter: { sendMail: (opts: Record<string, unknown>) => Promise<unknown> } | null = null;

async function getMailer() {
  if (!env.FEATURE_EMAIL_NOTIFICATIONS) return null;
  if (nodemailerTransporter) return nodemailerTransporter;
  try {
    const nodemailer = await import("nodemailer");
    nodemailerTransporter = nodemailer.default.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD ?? "",
      } : undefined,
    });
    return nodemailerTransporter;
  } catch {
    return null;
  }
}

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const mailer = await getMailer();
  if (!mailer) return;
  return mailer.sendMail({ from: env.EMAIL_FROM, to, subject, text, html: html || text });
}

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
  | "curator_assigned"
  | "question_received"
  | "question_forwarded"
  | "password_changed"
  | "profile_updated"
  | "popup"
  | "new_message"
  | "block_completed"
  | "module_completed"
  | "curator_response_reminder";

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
  curator_assigned: { title: "Куратор назначен", body: "Теперь у вас есть ответственный куратор." },
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

export async function createNotification(input: {
  userId: string;
  event: string;
  channel?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  refType?: string;
  refId?: string;
}) {
  // Проверяем настройки пользователя — если канал отключён, пропускаем
  const preferences = await getUserNotificationPreferences(input.userId);
  const prefKey = input.channel === "email" || input.channel === "email_and_in_app"
    ? input.event
    : input.channel ?? "in_app";

  if (preferences[prefKey] === false) {
    return null; // Пользователь отключил этот тип уведомлений
  }

  const eventKey = Object.keys(templates).includes(input.event) ? input.event as NotificationEvent : "profile_updated";
  const rendered = renderNotificationTemplate(eventKey, { title: input.title, body: input.body });

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.event,
      channel: input.channel ?? "in_app",
      title: rendered.title,
      body: rendered.body,
      status: "SENT",
      data: toJsonValue(input.data ?? {}),
      refType: input.refType ?? null,
      refId: input.refId ?? null,
    }
  });

  // Fetch user to get their email address
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true }
  });

  // Проверяем email-подписку отдельно
  if (user?.email && (input.channel === "email" || input.channel === "email_and_in_app")) {
    const emailPrefKey = `email_${input.event}`;
    if (preferences[emailPrefKey] !== false) {
      try {
        await sendEmail(user.email, rendered.title, rendered.body);
      } catch (error) {
        console.error(`Failed to send email notification to ${user.email}`, error);
      }
    }
  }

  return notification;
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getNotificationById(id: string, userId: string) {
  return prisma.notification.findFirst({
    where: { id, userId },
  });
}

export async function markNotificationAsRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date(), status: "READ" },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date(), status: "READ" }
  });
}
