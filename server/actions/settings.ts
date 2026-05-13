"use server";

import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { revalidatePath } from "next/cache";
import { getUserNotificationPreferences, setNotificationPreferences, type NotificationChannel } from "@/server/modules/notifications/preferences";
import { getAllAppSettings, setAppSettings, type AppSettings } from "@/server/modules/admin/settings";
import { createNotification } from "@/server/modules/notifications/service";

const prisma = getPrisma();

import { profileSchema } from "@/lib/validation";

export async function updateProfileSettingsAction(formData: FormData) {
  try {
    const user = await requireUser();
    const raw = Object.fromEntries(formData.entries());
    const data = profileSchema.parse(raw);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name ?? undefined,
        phone: data.phone ?? null,
        organization: data.organization ?? null,
        company: data.company ?? null,
        position: data.position ?? null,
      }
    });

    await createNotification({
      userId: user.id,
      event: "profile_updated",
      channel: "email",
    });

    revalidatePath("/", "layout");
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

    await createNotification({
      userId: userSession.id,
      event: "password_changed",
      channel: "email",
    });
  } catch (err) {
    throw err instanceof Error ? err : new Error("Failed to update password");
  }
}

export async function getNotificationPreferencesAction() {
  try {
    const user = await requireUser();
    return await getUserNotificationPreferences(user.id);
  } catch (err) {
    throw err instanceof Error ? err : new Error("Failed to get notification preferences");
  }
}

export async function updateNotificationPreferencesAction(formData: FormData) {
  try {
    const user = await requireUser();
    const preferences: { channel: NotificationChannel; enabled: boolean; courseId?: string | null }[] = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("notification_")) {
        const channel = key.replace("notification_", "") as NotificationChannel;
        const enabled = value === "true";
        preferences.push({ channel, enabled });
      }
    }

    await setNotificationPreferences(user.id, preferences);
    revalidatePath("/*", "layout");
  } catch (err) {
    throw err instanceof Error ? err : new Error("Failed to update notification preferences");
  }
}

export async function getAppSettingsAction() {
  try {
    await requireUser("users:read");
    return await getAllAppSettings();
  } catch (err) {
    throw err instanceof Error ? err : new Error("Failed to get app settings");
  }
}

export async function updateAppSettingsAction(formData: FormData) {
  try {
    await requireUser("users:read");
    const settings: Partial<AppSettings> = {};

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("setting_")) {
        const settingKey = key.replace("setting_", "");
        const strValue = String(value);
        if (strValue === "true" || strValue === "false") {
          settings[settingKey] = strValue === "true";
        } else if (!isNaN(Number(strValue))) {
          settings[settingKey] = Number(strValue);
        } else {
          settings[settingKey] = strValue;
        }
      }
    }

    await setAppSettings(settings);
    revalidatePath("/admin/settings", "layout");
  } catch (err) {
    throw err instanceof Error ? err : new Error("Failed to update app settings");
  }
}
