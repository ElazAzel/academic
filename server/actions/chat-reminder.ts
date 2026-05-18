"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotification } from "@/server/modules/notifications/service";

const REMINDER_HOURS = 2;
const REMINDER_COOLDOWN_HOURS = 4; // не напоминать повторно раньше этого времени

/**
 * Проверяет, есть ли у текущего куратора сообщения от слушателей,
 * на которые он не ответил дольше REMINDER_HOURS часов.
 * Отправляет одно напоминание на диалог (с дедупликацией).
 */
export async function checkUnansweredMessages() {
  const user = await getCurrentUser();
  if (!user) return { reminded: 0 };

  const isCurator = user.roles.some((r) => ["curator", "super_curator", "admin"].includes(r));
  if (!isCurator) return { reminded: 0 };

  const now = new Date();
  const remindThreshold = new Date(now.getTime() - REMINDER_HOURS * 60 * 60 * 1000);
  const cooldownThreshold = new Date(now.getTime() - REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000);

  // Находим все диалоги, где последнее сообщение от студента (не от текущего куратора)
  // и куратор ещё не ответил
  const conversations = await prisma.$queryRaw<Array<{
    student_id: string;
    student_name: string;
    last_msg_at: Date;
    last_text: string | null;
    lesson_id: string | null;
  }>>`
    SELECT DISTINCT ON (LEAST(m.sender_id, m.receiver_id), GREATEST(m.sender_id, m.receiver_id))
      CASE 
        WHEN m.sender_id = ${user.id} THEN m.receiver_id 
        ELSE m.sender_id 
      END AS student_id,
      u.name AS student_name,
      m.created_at AS last_msg_at,
      m.text AS last_text,
      m.lesson_id
    FROM messages m
    JOIN users u ON u.id = CASE WHEN m.sender_id = ${user.id} THEN m.receiver_id ELSE m.sender_id END
    WHERE (m.sender_id = ${user.id} OR m.receiver_id = ${user.id})
      AND m.sender_id != ${user.id} -- только сообщения от студента
    ORDER BY 
      LEAST(m.sender_id, m.receiver_id),
      GREATEST(m.sender_id, m.receiver_id),
      m.created_at DESC
  `;

  let reminded = 0;

  for (const convo of conversations) {
    // Пропускаем, если сообщение слишком свежее
    if (convo.last_msg_at > remindThreshold) continue;

    // Проверяем, не отвечал ли куратор ПОСЛЕ этого сообщения
    const curatorReply = await prisma.message.findFirst({
      where: {
        senderId: user.id,
        receiverId: convo.student_id,
        createdAt: { gt: convo.last_msg_at },
      },
      select: { id: true },
    });

    if (curatorReply) continue; // куратор уже ответил

    // Дедупликация: не отправлять повторное напоминание раньше cooldown
    const recentReminder = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: "curator_response_reminder",
        refId: convo.student_id,
        createdAt: { gt: cooldownThreshold },
      },
      select: { id: true },
    });

    if (recentReminder) continue;

    // Создаём напоминание
    await createNotification({
      userId: user.id,
      event: "curator_response_reminder",
      title: `Напоминание: ${convo.student_name ?? "слушатель"} ждёт ответа`,
      body: convo.last_text
        ? `"${convo.last_text.replace(/\s+/g, " ").slice(0, 100)}${convo.last_text.length > 100 ? "…" : ""}"`
        : "Слушатель отправил сообщение более 2 часов назад",
      data: {
        refType: "message",
        refId: convo.student_id,
        link: "/curator/chat",
        url: "/curator/chat",
        lessonId: convo.lesson_id,
        partnerName: convo.student_name,
      },
      refType: "message",
      refId: convo.student_id,
    });

    reminded++;
  }

  return { reminded };
}
