"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { QUERY_LIMITS } from "@/lib/query-limits";
import { buildStorageKey, createPresignedUploadUrl } from "@/lib/storage";
import { createNotification } from "@/server/modules/notifications/service";
import { maskChatName, deriveDisplayName } from "@/lib/auth/mask-name";
import { ApiError } from "@/lib/http";
import type { RoleKey } from "@/types/domain";

const prisma = getPrisma();

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

function isElevatedChatRole(roles: RoleKey[]) {
  return roles.includes("admin") || roles.includes("super_curator");
}

function getRoleKeys(user: { roles?: Array<{ role: { key: RoleKey } }> } | null | undefined): RoleKey[] {
  return user?.roles?.map((entry) => entry.role.key) ?? [];
}

async function assertCanAccessStudentChat(user: { id: string; roles: RoleKey[] }, studentId: string) {
  if (!studentId) {
    throw new ApiError("bad_request", "Student id is required", 400);
  }

  if (user.roles.includes("student")) {
    if (studentId !== user.id) {
      throw new ApiError("forbidden", "Students can only open their own chat", 403);
    }
    return;
  }

  if (isElevatedChatRole(user.roles)) {
    return;
  }

  const assignment = await prisma.curatorAssignment.findFirst({
    where: { studentId, curatorId: user.id, active: true },
    select: { id: true },
  });

  if (!assignment) {
    throw new ApiError("forbidden", "Student is not assigned to this curator", 403);
  }
}

export async function getConversation(studentId: string, lessonId?: string) {
  const user = await requireRole(["curator", "super_curator", "admin", "student"]);
  const roles = user.roles as RoleKey[];
  const targetUserId = roles.includes("student") ? user.id : studentId;

  await assertCanAccessStudentChat({ id: user.id, roles }, targetUserId);

  const lessonFilter = lessonId ? { lessonId } : {};

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: targetUserId, ...lessonFilter },
        { receiverId: targetUserId, ...lessonFilter },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: QUERY_LIMITS.chatConversationMessages,
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          roles: { select: { role: { select: { key: true } } } },
        },
      },
      lesson: { select: { id: true, title: true } },
    },
  });

  messages.reverse();

  return messages.map((m) => ({
    id: m.id,
    text: m.text,
    attachmentUrl: m.attachmentUrl,
    attachmentType: m.attachmentType,
    lessonId: m.lessonId,
    lessonTitle: m.lesson?.title ?? null,
    senderId: m.senderId,
    senderName: maskChatName(m.sender.name, m.senderId, roles, user.id, getRoleKeys(m.sender)),
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
  lessonId?: string;
  lessonTitle?: string;
}

export async function getMyConversations() {
  const user = await requireRole(["student", "curator", "super_curator", "admin", "instructor"]);
  const roles = user.roles as RoleKey[];

  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: user.id }, { receiverId: user.id }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          roles: { select: { role: { select: { key: true } } } },
        },
      },
      receiver: {
        select: {
          id: true,
          name: true,
          roles: { select: { role: { select: { key: true } } } },
        },
      },
      lesson: { select: { id: true, title: true } },
    },
    take: QUERY_LIMITS.chatConversationScan,
  });

  const convMap = new Map<string, ConversationInfo>();
  for (const m of messages) {
    const partnerId = m.senderId === user.id ? (m.receiverId ?? "") : m.senderId;
    if (!partnerId) continue;

    const rawName = m.senderId === user.id
      ? (m.receiver?.name ?? "Куратор")
      : (m.sender.name ?? "Слушатель");
    const partnerRoles = m.senderId === user.id ? getRoleKeys(m.receiver) : getRoleKeys(m.sender);
    const partnerName = maskChatName(rawName, partnerId, roles, user.id, partnerRoles);

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
      const existing = convMap.get(partnerId)!;
      if (m.readAt === null && m.senderId !== user.id) {
        existing.unread += 1;
      }
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
  const roles = user.roles as RoleKey[];
  const text = String(formData.get("text") ?? "").trim();
  const lessonId = String(formData.get("lessonId") ?? "").trim();
  const attachmentUrl = String(formData.get("attachmentUrl") ?? "").trim();
  const attachmentType = String(formData.get("attachmentType") ?? "").trim();
  const receiverId = String(formData.get("receiverId") ?? "").trim();

  if (!text && !attachmentUrl) {
    throw new ApiError("bad_request", "Текст или вложение обязательны", 400);
  }

  if (attachmentUrl && attachmentType && !ALLOWED_ATTACHMENT_TYPES.has(attachmentType)) {
    throw new ApiError("bad_request", "Формат вложения не поддерживается", 400);
  }

  let toUserId = receiverId;
  if (roles.includes("student")) {
    const assignment = await prisma.curatorAssignment.findFirst({
      where: { studentId: user.id, active: true },
      select: { curatorId: true },
    });
    if (!assignment) {
      throw new ApiError("forbidden", "У вас нет назначенного куратора", 403);
    }
    toUserId = assignment.curatorId;
  } else {
    if (!toUserId) {
      throw new ApiError("bad_request", "Receiver id is required", 400);
    }

    if (roles.includes("curator") && !isElevatedChatRole(roles)) {
      await assertCanAccessStudentChat({ id: user.id, roles }, toUserId);
    }
  }

  const receiver = await prisma.user.findUnique({
    where: { id: toUserId },
    select: { id: true, roles: { include: { role: true } } },
  });
  if (!receiver) {
    throw new ApiError("not_found", "Получатель не найден", 404);
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

  if (toUserId !== user.id) {
    const messagePreview = text ? (text.length > 100 ? `${text.substring(0, 100)}...` : text) : "Вложение";
    const receiverRoles = receiver.roles.map((entry) => entry.role.key);
    const receiverIsStudent = receiverRoles.includes("student");
    const link = receiverIsStudent
      ? (lessonId ? `/student/lessons/${lessonId}` : "/student")
      : "/curator/chat";

    const displaySenderName = deriveDisplayName(user.name, user.id, roles);

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
  return getUploadUrlForFile("image.png", "image/png");
}

export async function getUploadUrlForFile(filename: string, contentType: string) {
  const user = await requireRole(["student", "curator", "super_curator", "admin"]);
  const safeFilename = filename.trim() || "attachment";
  const safeContentType = contentType.trim();

  if (!ALLOWED_ATTACHMENT_TYPES.has(safeContentType)) {
    throw new ApiError("bad_request", "Формат вложения не поддерживается", 400);
  }

  const key = buildStorageKey(`chat/${user.id}`, safeFilename);
  return createPresignedUploadUrl(key, safeContentType);
}

export async function markAsRead(messageIds: string[]) {
  const user = await requireRole(["curator", "super_curator", "admin", "student"]);
  const ids = [...new Set(messageIds.filter(Boolean))];
  if (ids.length === 0) return { success: true };

  await prisma.message.updateMany({
    where: { id: { in: ids }, receiverId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { success: true };
}
