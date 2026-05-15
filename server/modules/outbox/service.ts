/**
 * Outbox service.
 *
 * Паттерн Transactional Outbox: запись события в ту же транзакцию, что и
 * бизнес-операция. Фоновый процесс (воркер / cron) читает pending события,
 * отправляет их и помечает как sent.
 *
 * Позволяет гарантировать доставку при масштабировании: вместо того чтобы
 * отправлять уведомления/аудиты синхронно в запросе пользователя, пишем в
 * outbox и возвращаем ответ. Отправка происходит асинхронно.
 */

import { getPrisma } from "@/lib/prisma";
import { toJsonValue } from "@/lib/json";

const prisma = getPrisma();

export async function writeOutboxEvent(
  eventType: string,
  payload: Record<string, unknown>,
): Promise<{ id: string }> {
  return prisma.outboxEvent.create({
    data: {
      eventType,
      payload: toJsonValue(payload),
      status: "pending",
    },
    select: { id: true },
  });
}

/**
 * Mark all pending events with the given IDs as sent.
 */
export async function markSent(ids: string[]): Promise<void> {
  await prisma.outboxEvent.updateMany({
    where: { id: { in: ids }, status: "pending" },
    data: { status: "sent", sentAt: new Date() },
  });
}

/**
 * Dequeue pending events, mark them as processing, return them.
 * Used by a background worker/cron.
 */
export async function dequeuePendingEvents(batchSize = 50) {
  const now = new Date();

  // Optimistic lock: try to claim events
  const events = await prisma.outboxEvent.findMany({
    where: {
      status: "pending",
      createdAt: { lte: now },
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });

  if (events.length === 0) return [];

  await prisma.outboxEvent.updateMany({
    where: { id: { in: events.map((e) => e.id) }, status: "pending" },
    data: { status: "processing" },
  });

  return events;
}

/**
 * Mark an event as failed with an error message.
 */
export async function markFailed(id: string, errorMsg: string): Promise<void> {
  await prisma.outboxEvent.update({
    where: { id },
    data: { status: "failed", error: errorMsg },
  });
}
