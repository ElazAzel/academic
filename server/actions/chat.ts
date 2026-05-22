"use server";

import { buildMessagePreview } from "@/lib/chat/utils";

import { revalidatePath } from "next/cache";
import { EnrollmentStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { QUERY_LIMITS } from "@/lib/query-limits";
import { buildStorageKey, createPresignedUploadUrl } from "@/lib/storage";
import { createNotification } from "@/server/modules/notifications/service";
import { maskChatName, deriveDisplayName } from "@/lib/auth/mask-name";
import { ApiError } from "@/lib/http";
import type { RoleKey } from "@/types/domain";

const prisma = getPrisma();
const MAX_CHAT_MESSAGE_LENGTH = 10_000;


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


async function getLessonContextForStudent(studentId: string, lessonId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      module: {
        course: {
          enrollments: {
            some: {
              userId: studentId,
              status: EnrollmentStatus.ACTIVE,
            },
          },
        },
      },
    },
    select: {
      id: true,
      title: true,
      module: {
        select: {
          id: true,
          title: true,
          courseId: true,
          course: { select: { title: true } },
        },
      },
    },
  });

  if (!lesson) {
    throw new ApiError("forbidden", "Контекст урока недоступен для этого слушателя", 403);
  }

  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    moduleId: lesson.module.id,
    moduleTitle: lesson.module.title,
    courseId: lesson.module.courseId,
    courseTitle: lesson.module.course.title,
  };
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
      replyTo: {
        select: {
          id: true,
          text: true,
          senderId: true,
          sender: { select: { name: true, roles: { select: { role: { select: { key: true } } } } } },
        },
      },
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
    replyToId: m.replyToId ?? null,
    replyToText: m.replyTo ? (m.replyTo.text ? m.replyTo.text.slice(0, 100) : "📎 Вложение") : null,
    replyToSenderName: m.replyTo ? maskChatName(m.replyTo.sender.name, m.replyTo.senderId, roles, user.id, getRoleKeys(m.replyTo.sender)) : null,
  }));
}

export interface ConversationInfo {
  partnerId: string;
  partnerName: string;
  lastMessage: string;
  lastDate: string;
  unread: number;
  responseStatus: "awaiting_reply" | "answered";
  responseLabel: string;
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
      const latestIsMine = m.senderId === user.id;
      convMap.set(partnerId, {
        partnerId,
        partnerName,
        lastMessage: buildMessagePreview(m.text ?? "", Boolean(m.attachmentUrl)),
        lastDate: m.createdAt.toISOString(),
        unread: m.readAt === null && m.senderId !== user.id ? 1 : 0,
        responseStatus: latestIsMine ? "answered" : "awaiting_reply",
        responseLabel: latestIsMine ? "Отвечено" : "Ожидает ответа",
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
  const user = await requireRole(["student", "curator", "super_curator", "admin", "instructor"]);
  const roles = user.roles as RoleKey[];
  const text = String(formData.get("text") ?? "").trim();
  const lessonId = String(formData.get("lessonId") ?? "").trim();
  const attachmentUrl = String(formData.get("attachmentUrl") ?? "").trim();
  const attachmentType = String(formData.get("attachmentType") ?? "").trim();
  const receiverId = String(formData.get("receiverId") ?? "").trim();
  const replyToIdStr = String(formData.get("replyToId") ?? "").trim();

  if (!text && !attachmentUrl) {
    throw new ApiError("bad_request", "Текст или вложение обязательны", 400);
  }
  if (text.length > MAX_CHAT_MESSAGE_LENGTH) {
    throw new ApiError("bad_request", `Сообщение слишком длинное. Максимум ${MAX_CHAT_MESSAGE_LENGTH} символов`, 400);
  }

  if (attachmentUrl && attachmentType && !ALLOWED_ATTACHMENT_TYPES.has(attachmentType)) {
    throw new ApiError("bad_request", "Формат вложения не поддерживается", 400);
  }

  // If replying, resolve lessonId from parent message
  let resolvedLessonId = lessonId;
  if (replyToIdStr && !lessonId) {
    const parentMsg = await prisma.message.findUnique({
      where: { id: replyToIdStr },
      select: { lessonId: true },
    });
    if (parentMsg?.lessonId) {
      resolvedLessonId = parentMsg.lessonId;
    }
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
    select: { id: true, name: true, roles: { include: { role: true } } },
  });
  if (!receiver) {
    throw new ApiError("not_found", "Получатель не найден", 404);
  }

  const receiverRoles = receiver.roles.map((entry) => entry.role.key as RoleKey);
  const receiverIsStudent = receiverRoles.includes("student");
  const contextStudentId = roles.includes("student") ? user.id : receiverIsStudent ? toUserId : null;
  const lessonContext = resolvedLessonId
    ? contextStudentId
      ? await getLessonContextForStudent(contextStudentId, resolvedLessonId)
      : (() => {
          throw new ApiError("bad_request", "Контекст урока можно указать только в диалоге со слушателем", 400);
        })()
    : null;

  const message = await prisma.message.create({
    data: {
      senderId: user.id,
      receiverId: toUserId,
      text: text || null,
      attachmentUrl: attachmentUrl || null,
      attachmentType: attachmentType || null,
      lessonId: resolvedLessonId || null,
      replyToId: replyToIdStr || null,
    },
    select: { id: true },
  });

  if (toUserId !== user.id) {
    const messagePreview = buildMessagePreview(text, Boolean(attachmentUrl));
    const link = receiverIsStudent
      ? (resolvedLessonId ? `/student/lessons/${resolvedLessonId}` : "/student")
      : "/curator/chat";

    const displaySenderName = deriveDisplayName(user.name, user.id, roles);
    const body = lessonContext?.lessonTitle
      ? `${lessonContext.lessonTitle}: ${messagePreview}`
      : messagePreview;

    await createNotification({
      userId: toUserId,
      event: "new_message",
      title: `Новое сообщение от ${displaySenderName}`,
      body,
      refType: "message",
      refId: message.id,
      data: {
        refType: "message",
        refId: message.id,
        link,
        url: link,
        messageId: message.id,
        senderId: user.id,
        senderName: displaySenderName,
        receiverId: toUserId,
        conversationStudentId: contextStudentId,
        lessonId: lessonContext?.lessonId ?? null,
        lessonTitle: lessonContext?.lessonTitle ?? null,
        moduleId: lessonContext?.moduleId ?? null,
        moduleTitle: lessonContext?.moduleTitle ?? null,
        courseId: lessonContext?.courseId ?? null,
        courseTitle: lessonContext?.courseTitle ?? null,
      },
    });
  }

  revalidatePath("/curator/chat");
  revalidatePath("/student");
  if (lessonId) {
    revalidatePath(`/student/lessons/${lessonId}`);
  }
  return { success: true };
}

export async function getUploadUrl() {
  return getUploadUrlForFile("image.png", "image/png");
}

export async function getUploadUrlForFile(filename: string, contentType: string) {
  const user = await requireRole(["student", "curator", "super_curator", "admin", "instructor"]);
  const safeFilename = filename.trim() || "attachment";
  const safeContentType = contentType.trim();

  if (!ALLOWED_ATTACHMENT_TYPES.has(safeContentType)) {
    throw new ApiError("bad_request", "Формат вложения не поддерживается", 400);
  }

  const key = buildStorageKey(`chat/${user.id}`, safeFilename);
  const result = await createPresignedUploadUrl(key, safeContentType);
  if (!result) {
    throw new ApiError("service_unavailable", "Хранилище S3 недоступно. Используйте /api/v1/chat/upload для загрузки через Supabase.", 503);
  }
  return result;
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
