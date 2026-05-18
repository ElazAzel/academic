/**
 * Outbox handler for notification events.
 *
 * Фоновый процесс читает pending события `notification.send` из outbox-таблицы
 * и вызывает createNotificationInternal для каждого. После успешной обработки
 * событие помечается как sent, при ошибке — как failed.
 *
 * Вызывается из cron-эндпоинта (см. app/api/v1/outbox/process/route.ts).
 */

import { dequeuePendingEvents, markFailed, markSent } from "@/server/modules/outbox/service";
import { createNotificationInternal } from "@/server/modules/notifications/service";

export async function processNotificationEvents(batchSize = 50): Promise<number> {
  const events = await dequeuePendingEvents(batchSize);
  const notificationEvents = events.filter((e) => e.eventType === "notification.send");

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
        await markFailed(event.id, `Invalid notification payload: missing userId or event`);
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Notifications Outbox] Failed event ${event.id}:`, msg);
      await markFailed(event.id, msg);
    }
  }

  if (processedIds.length > 0) {
    await markSent(processedIds);
  }

  return notificationEvents.length;
}
