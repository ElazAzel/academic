import { getPrisma } from "@/lib/prisma";
import { toJsonValue } from "@/lib/json";
import { env } from "@/lib/env";
import { getSafeErrorMetadata } from "@/lib/http";
import { getUserNotificationPreferences } from "@/server/modules/notifications/preferences";
import { normalizeNotificationChannel, renderNotificationTemplate, resolveNotificationEvent, securityNotificationEvents } from "@/server/modules/notifications/templates";
import { sendEmail } from "@/server/modules/notifications/email";
import { NOTIFICATION_CHANNELS } from "@/lib/constants";

const prisma = getPrisma();

// ── Re-exports ────────────────────────────────────────────────────────────────

export { normalizeNotificationChannel, renderNotificationTemplate, sendEmail };

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Создаёт уведомление синхронно (без outbox).
 *
 * In-app уведомления создаются непосредственно в БД, email/push отправляются
 * сразу (если настроены). Outbox не используется, потому что платформа
 * работает на Vercel Hobby tier без поддержки cron-воркеров.
 *
 * Если пользователь отключил этот тип уведомлений в настройках — пропускает.
 *
 * Возвращает ID созданного уведомления (или пустую строку, если пропущено).
 */
export async function createNotification(input: {
  userId: string;
  event: string;
  channel?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  refType?: string;
  refId?: string;
  persist?: boolean;
}): Promise<{ id: string }> {
  const notification = await createNotificationInternal({
    userId: input.userId,
    event: input.event,
    channel: input.channel ?? "in_app",
    title: input.title,
    body: input.body,
    data: input.data,
    refType: input.refType,
    refId: input.refId,
    persist: input.persist,
  });

  if (notification) {
    return { id: notification.id as string };
  }

  return { id: "" };
}

/**
 * Внутренняя реализация — создаёт уведомление в БД и отправляет email/push.
 * Вызывается outbox-обработчиком, НЕ напрямую из бизнес-кода.
 */
export async function createNotificationInternal(input: {
  userId: string;
  event: string;
  channel?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  refType?: string;
  refId?: string;
  persist?: boolean;
}) {
  const channel = normalizeNotificationChannel(input.channel);
  const isSecurityEvent = securityNotificationEvents.has(input.event);
  // По умолчанию persist = true — сохраняем в БД
  const persist = isSecurityEvent || input.persist !== false;

  // Проверяем настройки пользователя — если канал отключён, пропускаем
  const preferences = await getUserNotificationPreferences(input.userId);

  // Системные уведомления безопасности не отключаются!
  if (!isSecurityEvent) {
    const prefKey =
      channel === NOTIFICATION_CHANNELS.EMAIL || channel === NOTIFICATION_CHANNELS.EMAIL_AND_IN_APP
        ? input.event
        : channel;

    if (preferences[prefKey] === false) {
      return null; // Пользователь отключил этот тип уведомлений
    }
  }

  const eventKey = resolveNotificationEvent(input.event);
  const rendered = renderNotificationTemplate(eventKey, { title: input.title, body: input.body });

  // persist=false — отправляем email/push без сохранения в БД (silent notification)
  let notification: Record<string, unknown> | null = null;
  if (persist) {
    notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.event,
        channel,
        title: rendered.title,
        body: rendered.body,
        status: "SENT",
        data: toJsonValue(input.data ?? {}),
        refType: input.refType ?? null,
        refId: input.refId ?? null,
      },
    });
  }

  // Fetch user to get their email address
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });

  // Проверяем email-подписку отдельно
  if (user?.email && (channel === NOTIFICATION_CHANNELS.EMAIL || channel === NOTIFICATION_CHANNELS.EMAIL_AND_IN_APP)) {
    const emailPrefKey = `email_${input.event}`;
    if (isSecurityEvent || preferences[emailPrefKey] !== false) {
      try {
        await sendEmail(user.email, rendered.title, rendered.body);
      } catch (error) {
        console.error("[Notifications] Failed to send email notification", getSafeErrorMetadata(error));
      }
    }
  }

  // Push notification (Web Push via VAPID)
  if (env.FEATURE_PUSH_NOTIFICATIONS && channel !== NOTIFICATION_CHANNELS.EMAIL) {
    try {
      const { sendPushToUser } = await import("@/server/modules/notifications/push");
      const notificationData = input.data as Record<string, string | undefined> | undefined;
      await sendPushToUser(input.userId, {
        title: rendered.title,
        body: rendered.body,
        url: notificationData?.url ?? notificationData?.link,
        tag: notification ? `${input.event}-${notification.id}` : `${input.event}-${Date.now()}`,
      });
    } catch (error) {
      console.error("[Notifications] Failed to send push notification", getSafeErrorMetadata(error));
    }
  }

  return notification;
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      type: true,
      channel: true,
      title: true,
      body: true,
      data: true,
      refType: true,
      refId: true,
      status: true,
      readAt: true,
      createdAt: true,
    },
  });
}

export async function getNotificationById(id: string, userId: string) {
  return prisma.notification.findFirst({
    where: { id, userId },
    select: {
      id: true,
      type: true,
      channel: true,
      title: true,
      body: true,
      data: true,
      refType: true,
      refId: true,
      status: true,
      readAt: true,
      createdAt: true,
    },
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
    data: { readAt: new Date(), status: "READ" },
  });
}
