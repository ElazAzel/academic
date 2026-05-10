"use server";

import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { revalidatePath } from "next/cache";

const prisma = getPrisma();

export async function updateProfileSettingsAction(formData: FormData) {
  try {
    const user = await requireUser();
    const name = formData.get("name") as string;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || undefined
      }
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    throw err instanceof Error ? err : new Error("Failed to update profile");
  }
}

export async function updatePasswordAction(formData: FormData) {
  try {
    const userSession = await requireUser();
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      throw new Error("Новые пароли не совпадают");
    }

    if (newPassword.length < 10) {
      throw new Error("Пароль должен быть минимум 10 символов");
    }

    const dbUser = await prisma.user.findUnique({ where: { id: userSession.id } });
    if (!dbUser || !dbUser.passwordHash) {
      throw new Error("Учетная запись не найдена");
    }

    const isValid = await verifyPassword(dbUser.passwordHash, currentPassword);
    if (!isValid) {
      throw new Error("Неверный текущий пароль");
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { passwordHash: newHash }
    });

    return { success: true };
  } catch (err) {
    throw err instanceof Error ? err : new Error("Failed to update password");
  }
}
