"use server";

import { z } from "zod";
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
  try {
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

    // Filter stale conversations in-memory, then batch-check curator replies + reminders
    const staleConversations = conversations.filter((c) => c.last_msg_at <= remindThreshold);
    if (staleConversations.length === 0) return { reminded };

    // Batch 1: find which stale conversations have NO curator reply after the student message
    const replyChecks = await Promise.all(
      staleConversations.map((c) =>
        prisma.message
          .findFirst({
            where: {
              senderId: user.id,
              receiverId: c.student_id,
              createdAt: { gt: c.last_msg_at },
            },
            select: { id: true },
          })
          .then((reply) => ({ studentId: c.student_id, hasLaterReply: !!reply }))
      )
    );

    const unrespondedIds = replyChecks
      .filter((r) => !r.hasLaterReply)
      .map((r) => r.studentId);

    // Batch 2: exclude those with a recent reminder (cooldown)
    let studentIdsToRemind = unrespondedIds;
    if (unrespondedIds.length > 0) {
      const recentReminders = await prisma.notification.findMany({
        where: {
          userId: user.id,
          type: "curator_response_reminder",
          refId: { in: unrespondedIds },
          createdAt: { gt: cooldownThreshold },
        },
        select: { refId: true },
      });

      const remindedRecently = new Set(recentReminders.map((r) => r.refId));
      studentIdsToRemind = unrespondedIds.filter((id) => !remindedRecently.has(id));
    }

    // Batch 3: create notifications for all conversations needing reminders
    const convoMap = new Map(staleConversations.map((c) => [c.student_id, c]));
    for (const studentId of studentIdsToRemind) {
      const convo = convoMap.get(studentId);
      if (!convo) continue;

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
  } catch (error) {
    console.error("[checkUnansweredMessages]", error);
    throw error;
  }
}
