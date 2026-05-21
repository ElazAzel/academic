/**
 * One-time script to flush pending notification events from the outbox.
 *
 * До перехода на синхронные уведомления (2026-05-21) все уведомления
 * писались в outbox_events, но никогда не обрабатывались (нет cron-воркера
 * на Vercel Hobby tier). Этот скрипт обрабатывает накопившиеся события
 * и создаёт реальные записи в таблице notifications.
 *
 * Usage:
 *   npx tsx scripts/flush-notifications.ts
 */

import { getPrisma } from "../lib/prisma";
import { dequeuePendingEvents, markFailed, markSent } from "../server/modules/outbox/service";
import { createNotificationInternal } from "../server/modules/notifications/service";

async function flushPendingNotifications() {
  const prisma = getPrisma();

  const totalPending = await prisma.outboxEvent.count({
    where: { eventType: "notification.send", status: "pending" },
  });

  if (totalPending === 0) {
    console.log("Нет ожидающих уведомлений в outbox.");
    return;
  }

  console.log(`Найдено ${totalPending} ожидающих уведомлений. Обработка...`);

  let processed = 0;
  let failed = 0;

  while (true) {
    const events = await dequeuePendingEvents(50);
    const notificationEvents = events.filter((e) => e.eventType === "notification.send");

    if (notificationEvents.length === 0) break;

    const processedIds: string[] = [];

    for (const event of notificationEvents) {
      try {
        const payload = event.payload as {
          userId: string;
          event: string;
          channel?: string;
          title?: string | null;
          body?: string | null;
          data?: Record<string, unknown>;
          refType?: string | null;
          refId?: string | null;
        };

        if (!payload.userId || !payload.event) {
          await markFailed(event.id, "Invalid notification payload");
          failed++;
          continue;
        }

        await createNotificationInternal({
          userId: payload.userId,
          event: payload.event,
          channel: payload.channel,
          title: payload.title ?? undefined,
          body: payload.body ?? undefined,
          data: payload.data,
          refType: payload.refType ?? undefined,
          refId: payload.refId ?? undefined,
        });

        processedIds.push(event.id);
        processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[Flush] Failed event ${event.id}:`, msg);
        await markFailed(event.id, msg);
        failed++;
      }
    }

    if (processedIds.length > 0) {
      await markSent(processedIds);
    }

    console.log(`  Прогресс: ${processed + failed}/${totalPending} (успешно: ${processed}, ошибок: ${failed})`);
  }

  console.log(`\nГотово. Обработано: ${processed}, ошибок: ${failed}`);
}

flushPendingNotifications()
  .then(() => {
    console.log("Скрипт завершён.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Ошибка:", err);
    process.exit(1);
  });
