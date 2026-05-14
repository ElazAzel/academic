"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { buildStorageKey, createPresignedUploadUrl } from "@/lib/storage";

const prisma = getPrisma();

export async function getConversation(studentId: string, lessonId?: string) {
  const user = await requireRole(["curator", "super_curator", "admin", "student"]);
  const isStudent = user.roles.includes("student");

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: studentId, receiverId: isStudent ? user.id : undefined, ...(lessonId ? { lessonId } : {}) },
        { senderId: isStudent ? user.id : undefined, receiverId: studentId, ...(lessonId ? { lessonId } : {}) },
      ],
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true } },
    },
  });

  return messages.map((m) => ({
    id: m.id,
    text: m.text,
    attachmentUrl: m.attachmentUrl,
    attachmentType: m.attachmentType,
    senderId: m.senderId,
    senderName: m.sender.name ?? "",
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
    isMine: m.senderId === user.id,
  }));
}

export async function getMyConversations() {
  const user = await requireRole(["student", "curator", "super_curator", "admin"]);
  const isStudent = user.roles.includes("student");

  const messages = await prisma.message.findMany({
    where: isStudent
      ? { senderId: user.id }
      : { OR: [{ senderId: user.id }, { receiverId: user.id }] },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
    },
    take: 100,
  });

  // Group by conversation partner
  const convMap = new Map<string, { partnerId: string; partnerName: string; lastMessage: string; lastDate: string; unread: number }>();
  for (const m of messages) {
    const partnerId = m.senderId === user.id ? (m.receiverId ?? "") : m.senderId;
    const partnerName = m.senderId === user.id ? (m.receiver?.name ?? "Куратор") : (m.sender.name ?? "Слушатель");
    if (!convMap.has(partnerId)) {
      convMap.set(partnerId, {
        partnerId,
        partnerName,
        lastMessage: m.text ?? "(вложение)",
        lastDate: m.createdAt.toISOString(),
        unread: m.readAt === null && m.senderId !== user.id ? 1 : 0,
      });
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

  if (!text && !attachmentUrl) throw new Error("Текст или вложение обязательны");

  // Determine receiver: students send to their curator, others are explicit
  let toUserId = receiverId;
  if (user.roles.includes("student") && !toUserId) {
    const assignment = await prisma.curatorAssignment.findFirst({
      where: { studentId: user.id, active: true },
      select: { curatorId: true },
    });
    if (!assignment) throw new Error("У вас нет назначенного куратора");
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

  revalidatePath("/curator/questions");
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
