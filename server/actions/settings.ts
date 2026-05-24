"use server";

import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { revalidatePath } from "next/cache";
import { getUserNotificationPreferences, setNotificationPreferences, type NotificationChannel } from "@/server/modules/notifications/preferences";
import { getAllAppSettings, setAppSettings, type AppSettings } from "@/server/modules/admin/settings";
import { createNotification } from "@/server/modules/notifications/service";
import { logAudit } from "@/server/modules/audit/service";
import { ApiError } from "@/lib/http";

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
    });
    await logAudit({
      actorId: user.id,
      action: "profile.updated",
      entity: "user",
      entityId: user.id,
      metadata: { fields: Object.keys(data) },
    });

    revalidatePath("/", "layout");
  } catch (err) {
    throw err instanceof Error ? err : new ApiError("internal_error", "Failed to update profile", 500);
  }
}

export async function updatePasswordAction(formData: FormData) {
  try {
    const userSession = await requireUser();
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      throw new ApiError("bad_request", "Новые пароли не совпадают", 400);
    }

    if (newPassword.length < 10) {
      throw new ApiError("bad_request", "Пароль должен быть минимум 10 символов", 400);
    }

    const dbUser = await prisma.user.findUnique({ where: { id: userSession.id } });
    if (!dbUser || !dbUser.passwordHash) {
      throw new ApiError("not_found", "Учетная запись не найдена", 404);
    }

    const isValid = await verifyPassword(dbUser.passwordHash, currentPassword);
    if (!isValid) {
      throw new ApiError("bad_request", "Неверный текущий пароль", 400);
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { passwordHash: newHash }
    });

    await createNotification({
      userId: userSession.id,
      event: "password_changed",
    });
    await logAudit({
      actorId: userSession.id,
      action: "auth.password_changed",
      entity: "user",
      entityId: userSession.id,
    });
  } catch (err) {
    throw err instanceof Error ? err : new ApiError("internal_error", "Failed to update password", 500);
  }
}

export async function getNotificationPreferencesAction() {
  try {
    const user = await requireUser();
    return await getUserNotificationPreferences(user.id);
  } catch (err) {
    throw err instanceof Error ? err : new ApiError("internal_error", "Failed to get notification preferences", 500);
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
    throw err instanceof Error ? err : new ApiError("internal_error", "Failed to update notification preferences", 500);
  }
}

export async function incrementBuildVersionAction() {
  try {
    await requireUser("settings:manage");
    const current = await getAllAppSettings();
    const nextVersion = ((current.BUILD_VERSION as number) ?? 0) + 1;
    await setAppSettings({ BUILD_VERSION: nextVersion });
    revalidatePath("/admin/settings", "layout");
  } catch (err) {
    throw err instanceof Error ? err : new ApiError("internal_error", "Failed to increment build version", 500);
  }
}

export async function getAppSettingsAction() {
  try {
    await requireUser("settings:manage");
    return await getAllAppSettings();
  } catch (err) {
    throw err instanceof Error ? err : new ApiError("internal_error", "Failed to get app settings", 500);
  }
}

export async function updateAppSettingsAction(formData: FormData) {
  try {
    await requireUser("settings:manage");
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
    throw err instanceof Error ? err : new ApiError("internal_error", "Failed to update app settings", 500);
  }
}
