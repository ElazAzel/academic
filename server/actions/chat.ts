"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { buildStorageKey, createPresignedUploadUrl } from "@/lib/storage";
import { createNotification } from "@/server/modules/notifications/service";
import { maskChatName, deriveDisplayName } from "@/lib/auth/mask-name";
import { ApiError } from "@/lib/http";

const prisma = getPrisma();

export async function getConversation(studentId: string, lessonId?: string) {
  const user = await requireRole(["curator", "super_curator", "admin", "student"]);
  const isStudent = user.roles.includes("student");

  // Prevent IDOR: students can only see their own conversations
  const targetUserId = isStudent ? user.id : studentId;

  const lessonFilter = lessonId ? { lessonId } : {};

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: targetUserId, ...lessonFilter },
        { receiverId: targetUserId, ...lessonFilter },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      sender: { select: { id: true, name: true } },
    },
  });

  // Reverse to show oldest first in UI
  messages.reverse();

  return messages.map((m) => ({
    id: m.id,
    text: m.text,
    attachmentUrl: m.attachmentUrl,
    attachmentType: m.attachmentType,
    senderId: m.senderId,
    senderName: maskChatName(m.sender.name, m.senderId, user.roles as import("@/types/domain").RoleKey[], user.id),
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
    isMine: m.senderId === user.id,
  }));
}

export interface ConversationInfo {
  partnerId: string;
  partnerName: string;
  lastMessage: string;
  lastDate: string;
  unread: number;
  /** Урок, с которого начат диалог (если есть) */
  lessonId?: string;
  lessonTitle?: string;
}

export async function getMyConversations() {
  const user = await requireRole(["student", "curator", "super_curator", "admin"]);

  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: user.id }, { receiverId: user.id }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
      lesson: { select: { id: true, title: true } },
    },
    take: 200,
  });

  // Group by conversation partner, collecting lesson info from each message
  const convMap = new Map<string, ConversationInfo>();
  for (const m of messages) {
    const partnerId = m.senderId === user.id ? (m.receiverId ?? "") : m.senderId;
    const rawName = m.senderId === user.id ? (m.receiver?.name ?? "Куратор") : (m.sender.name ?? "Слушатель");
    const partnerName = maskChatName(rawName, partnerId, user.roles as import("@/types/domain").RoleKey[], user.id);

    if (!convMap.has(partnerId)) {
      convMap.set(partnerId, {
        partnerId,
        partnerName,
        lastMessage: m.text ?? "(вложение)",
        lastDate: m.createdAt.toISOString(),
        unread: m.readAt === null && m.senderId !== user.id ? 1 : 0,
        lessonId: m.lessonId ?? undefined,
        lessonTitle: m.lesson?.title ?? undefined,
      });
    } else {
      // Update unread counter
      const existing = convMap.get(partnerId)!;
      if (m.readAt === null && m.senderId !== user.id) {
        existing.unread += 1;
      }
      // Keep the lesson info from the FIRST (most recent) message as the primary context
      // But if the first message has no lesson and a later one does, update
      if (!existing.lessonId && m.lessonId) {
        existing.lessonId = m.lessonId;
        existing.lessonTitle = m.lesson?.title ?? undefined;
      }
    }
  }

  return Array.from(convMap.values()).sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

export async function sendMessageAction(formData: FormData) {
  const user = await requireRole(["student", "curator", "super_curator", "admin"]);
  const text = formData.get("text") as string;
  const lessonId = formData.get("lessonId") as string;
  const attachmentUrl = formData.get("attachmentUrl") as string;
  const attachmentType = formData.get("attachmentType") as string;
  const receiverId = formData.get("receiverId") as string;

  if (!text && !attachmentUrl) throw new ApiError("bad_request", "Текст или вложение обязательны", 400);

  // Determine receiver: students ALWAYS send to their assigned curator (prevent IDOR)
  let toUserId = receiverId;
  if (user.roles.includes("student")) {
    const assignment = await prisma.curatorAssignment.findFirst({
      where: { studentId: user.id, active: true },
      select: { curatorId: true },
    });
    if (!assignment) throw new ApiError("forbidden", "У вас нет назначенного куратора", 403);
    toUserId = assignment.curatorId;
  }

  await prisma.message.create({
    data: {
      senderId: user.id,
      receiverId: toUserId,
      text: text || null,
      attachmentUrl: attachmentUrl || null,
    attachmentType: attachmentType || null,
    lessonId: lessonId || null,
  },
  });

    // Create notification for receiver
    if (toUserId && toUserId !== user.id) {
      const messagePreview = text ? (text.length > 100 ? text.substring(0, 100) + "…" : text) : "Вложение";
      const isCurator = user.roles.includes("curator") || user.roles.includes("super_curator") || user.roles.includes("admin");
      // Link must be relative to the RECEIVER's role, not the sender's:
      // - If curator sends → receiver is student → link to student's lesson
      // - If student sends → receiver is curator → link to curator's chat
      const link = isCurator
        ? (lessonId
            ? `/student/lessons/${lessonId}`
            : `/student`)
        : `/curator/chat`;

      const displaySenderName = deriveDisplayName(user.name, user.id);

      await createNotification({
        userId: toUserId,
        event: "new_message",
        title: `Новое сообщение от ${displaySenderName}`,
        body: messagePreview,
        data: {
          refType: "message",
          refId: lessonId || "general",
          link,
          senderId: user.id,
          senderName: displaySenderName,
        },
      });
    }

  revalidatePath("/curator/chat");
  revalidatePath("/student");
  return { success: true };
}

export async function getUploadUrl() {
  const user = await requireRole(["student", "curator", "super_curator", "admin"]);
  const key = buildStorageKey(`chat/${user.id}`, "image.png");
  return createPresignedUploadUrl(key, "image/png");
}

export async function markAsRead(messageIds: string[]) {
  await requireRole(["curator", "super_curator", "admin", "student"]);
  await prisma.message.updateMany({
    where: { id: { in: messageIds }, readAt: null },
    data: { readAt: new Date() },
  });
  return { success: true };
}
