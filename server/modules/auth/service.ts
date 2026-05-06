import { RoleKey } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/server/modules/audit/service";

const prisma = getPrisma();

export async function registerUser(input: {
  email: string;
  name: string;
  password: string;
  consentAccepted: true;
}) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError("conflict", "Пользователь уже существует", 409);
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.$transaction(async (tx) => {
    const role = await tx.role.findUnique({ where: { key: RoleKey.student } });
    if (!role) {
      throw new ApiError("internal_error", "Роль student не создана", 500);
    }
    const created = await tx.user.create({
      data: {
        email,
        name: input.name,
        passwordHash,
        roles: { create: { roleId: role.id } },
        consentLogs: {
          create: {
            type: "personal_data_processing",
            status: "ACCEPTED",
            version: "2026-05-07",
            acceptedAt: new Date()
          }
        }
      },
      select: { id: true, email: true, name: true }
    });
    await tx.verificationToken.create({
      data: {
        identifier: email,
        token: crypto.randomUUID(),
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24)
      }
    });
    return created;
  });

  await logAudit({ actorId: user.id, action: "auth.register", entity: "user", entityId: user.id });
  return user;
}

export async function requestPasswordReset(emailInput: string) {
  const email = emailInput.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { accepted: true };
  }
  await prisma.verificationToken.create({
    data: {
      identifier: `reset:${email}`,
      token: crypto.randomUUID(),
      expires: new Date(Date.now() + 1000 * 60 * 30)
    }
  });
  await logAudit({ actorId: user.id, action: "auth.password_reset_requested", entity: "user", entityId: user.id });
  return { accepted: true };
}

export async function resetPassword(token: string, password: string) {
  const verification = await prisma.verificationToken.findUnique({ where: { token } });
  if (!verification || verification.expires < new Date() || !verification.identifier.startsWith("reset:")) {
    throw new ApiError("bad_request", "Токен сброса недействителен", 400);
  }
  const email = verification.identifier.replace("reset:", "");
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash },
    select: { id: true, email: true }
  });
  await prisma.verificationToken.delete({ where: { token } });
  await logAudit({ actorId: user.id, action: "auth.password_reset_completed", entity: "user", entityId: user.id });
  return { reset: true };
}

export async function verifyEmail(token: string) {
  const verification = await prisma.verificationToken.findUnique({ where: { token } });
  if (!verification || verification.expires < new Date() || verification.identifier.startsWith("reset:")) {
    throw new ApiError("bad_request", "Токен подтверждения недействителен", 400);
  }
  const user = await prisma.user.update({
    where: { email: verification.identifier },
    data: { emailVerified: new Date() },
    select: { id: true, email: true }
  });
  await prisma.verificationToken.delete({ where: { token } });
  await logAudit({ actorId: user.id, action: "auth.email_verified", entity: "user", entityId: user.id });
  return { verified: true };
}

export async function getProfile(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      locale: true,
      roles: { include: { role: true } },
      consentLogs: { orderBy: { createdAt: "desc" }, take: 5 }
    }
  });
}

