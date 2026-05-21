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

import { Prisma } from "@prisma/client";
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
 *
 * Uses atomic UPDATE … RETURNING with FOR UPDATE SKIP LOCKED so
 * concurrent workers never claim the same row. Also rescues events
 * stuck in "processing" for more than 10 minutes (crashed worker).
 */
export async function dequeuePendingEvents(batchSize = 50) {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      event_type: string;
      eventType?: string;
      payload: unknown;
      status: string;
      error: string | null;
      created_at: Date;
      sent_at: Date | null;
    }>
  >(
    Prisma.sql`
      UPDATE "outbox_event"
      SET "status" = 'processing'
      WHERE "id" IN (
        SELECT "id" FROM "outbox_event"
        WHERE "status" = 'pending'
           OR ("status" = 'processing' AND "sent_at" IS NULL AND "created_at" < ${cutoff})
        ORDER BY "created_at" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    eventType: row.event_type ?? row.eventType ?? "",
    payload: row.payload,
    status: "processing",
    error: row.error,
    createdAt: row.created_at,
    sentAt: row.sent_at,
  }));
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
