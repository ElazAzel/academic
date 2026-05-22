import { cache } from "react";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/server/modules/audit/service";
import { createNotification, sendEmail } from "@/server/modules/notifications/service";
import type { z } from "zod";
import type { profileSchema } from "@/lib/validation";

const prisma = getPrisma();

export async function requestPasswordReset(emailInput: string) {
  const email = emailInput.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { accepted: true };
  }
  const token = crypto.randomUUID();
  await prisma.verificationToken.create({
    data: {
      identifier: `reset:${email}`,
      token,
      expires: new Date(Date.now() + 1000 * 60 * 30)
    }
  });

  const resetLink = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;
  try {
    await sendEmail(
      email,
      "Сброс пароля",
      `Для сброса пароля перейдите по ссылке: ${resetLink}`
    );
  } catch (error) {
    console.error(`Failed to send password reset email to ${email}`, error);
  }

  await logAudit({ actorId: user.id, action: "auth.password_reset_requested", entity: "user", entityId: user.id });
  return { accepted: true };
}

export async function resetPassword(token: string, password: string) {
  // Атомарный delete — исключает TOCTOU: если два запроса с одинаковым токеном,
  // второй получит null и корректно отклонит сброс
  const tokenRecord = await prisma.verificationToken.delete({ where: { token } }).catch(() => null);
  if (!tokenRecord || tokenRecord.expires < new Date() || !tokenRecord.identifier.startsWith("reset:")) {
    throw new ApiError("bad_request", "Токен сброса недействителен", 400);
  }
  const email = tokenRecord.identifier.replace("reset:", "");
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash },
    select: { id: true, email: true }
  });
  await logAudit({ actorId: user.id, action: "auth.password_reset_completed", entity: "user", entityId: user.id });
  await createNotification({
    userId: user.id,
    event: "password_changed",
    refType: "user",
    refId: user.id,
    data: { source: "password_reset" },
  });
  return { reset: true };
}

export async function verifyEmail(token: string) {
  // Атомарный delete — исключает TOCTOU
  const tokenRecord = await prisma.verificationToken.delete({ where: { token } }).catch(() => null);
  if (!tokenRecord || tokenRecord.expires < new Date() || tokenRecord.identifier.startsWith("reset:")) {
    throw new ApiError("bad_request", "Токен подтверждения недействителен", 400);
  }
  const user = await prisma.user.update({
    where: { email: tokenRecord.identifier },
    data: { emailVerified: new Date() },
    select: { id: true, email: true }
  });
  await logAudit({ actorId: user.id, action: "auth.email_verified", entity: "user", entityId: user.id });
  return { verified: true };
}

export async function updateProfile(
  userId: string,
  data: z.infer<typeof profileSchema>
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name ?? undefined,
      phone: data.phone ?? null,
      organization: data.organization ?? null,
      company: data.company ?? null,
      position: data.position ?? null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      organization: true,
      company: true,
      position: true,
    },
  });
}

export const getProfile = cache(async (userId: string) => {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      locale: true,
      phone: true,
      organization: true,
      company: true,
      position: true,
      roles: { include: { role: true } },
      consentLogs: { orderBy: { createdAt: "desc" }, take: 5 }
    }
  });
});
