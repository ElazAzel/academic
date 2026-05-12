import { getPrisma } from "@/lib/prisma";
import { toJsonValue } from "@/lib/json";
import nodemailer from "nodemailer";

const prisma = getPrisma();

import { env } from "@/lib/env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD ?? "",
  } : undefined,
});

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  return transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    text,
    html: html || text,
  });
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

  const notification = await prisma.notification.create({
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

  // Fetch user to get their email address
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true }
  });

  if (user?.email && (input.channel === "email" || input.channel === "email_and_in_app" || !input.channel)) {
    try {
      await sendEmail(user.email, rendered.title, rendered.body);
    } catch (error) {
      console.error(`Failed to send email notification to ${user.email}`, error);
    }
  }

  return notification;
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}
