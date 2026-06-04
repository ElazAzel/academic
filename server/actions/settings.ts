"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { revalidatePath } from "next/cache";
import { getUserNotificationPreferences, setNotificationPreferences, type NotificationChannel } from "@/server/modules/notifications/preferences";
import { getAllAppSettings, setAppSettings, type AppSettings } from "@/server/modules/admin/settings";
import { BRANDING_SETTING_KEYS, normalizeHexColor } from "@/server/modules/branding/service";
import { createNotification } from "@/server/modules/notifications/service";
import { logAudit } from "@/server/modules/audit/service";
import { ApiError } from "@/lib/http";
import { profileSchema } from "@/lib/validation";

const prisma = getPrisma();

const notificationChannels = new Set<NotificationChannel>([
  "in_app",
  "email",
  "curator_reply",
  "module_deadline",
  "new_lesson",
  "assignment_graded",
  "email_digest",
  "curator_question",
  "student_submission",
  "lesson_comment",
  "deadline_reminder",
  "system_message",
]);

const formPasswordField = z.preprocess(
  (value) => (typeof value === "string" ? value : ""),
  z.string()
);

const PasswordSettingsSchema = z.object({
  currentPassword: formPasswordField.pipe(z.string().min(1, "Текущий пароль обязателен")),
  newPassword: formPasswordField.pipe(z.string().min(10, "Пароль должен быть минимум 10 символов")),
  confirmPassword: formPasswordField.pipe(z.string().min(1, "Подтверждение пароля обязательно")),
}).refine((data) => data.newPassword === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Новые пароли не совпадают",
});

const brandText = (max: number, message: string) =>
  z.preprocess((value) => (typeof value === "string" ? value.trim() : ""), z.string().min(1, message).max(max));

const optionalBrandText = (max: number) =>
  z.preprocess((value) => (typeof value === "string" ? value.trim() : ""), z.string().max(max));

const hexColor = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u, "Цвет должен быть в формате #RRGGBB")
);

const logoUrlSchema = optionalBrandText(500).refine(
  (value) => value === "" || (value.startsWith("/") && !value.startsWith("//")) || value.startsWith("https://"),
  "Логотип должен быть относительным адресом платформы или HTTPS-ссылкой"
);

const BrandingSettingsSchema = z.object({
  name: brandText(80, "Название бренда обязательно"),
  shortName: brandText(32, "Короткое название обязательно"),
  subtitle: brandText(80, "Подзаголовок обязателен"),
  description: brandText(180, "Описание обязательно"),
  metadataDescription: brandText(240, "Описание для браузера обязательно"),
  logoIcon: brandText(48, "Иконка обязательна").refine(
    (value) => /^[a-z0-9_]+$/u.test(value),
    "Название иконки должно быть без пробелов и специальных символов"
  ),
  logoUrl: logoUrlSchema,
  supportEmail: brandText(120, "Email поддержки обязателен").pipe(z.string().email("Некорректный email поддержки")),
  primaryColor: hexColor,
  primaryContainerColor: hexColor,
  accentColor: hexColor,
  accentContainerColor: hexColor,
  backgroundColor: hexColor,
  surfaceColor: hexColor,
});

function validationError(error: z.ZodError) {
  return new ApiError("bad_request", error.errors[0]?.message ?? "Некорректные данные", 400);
}

function throwSafeSettingsError(err: unknown, label: string, message: string): never {
  if (err instanceof ApiError) throw err;
  if (err instanceof z.ZodError) throw validationError(err);
  console.error(label, err);
  throw new ApiError("internal_error", message, 500);
}

function assertNotificationChannel(channel: string): asserts channel is NotificationChannel {
  if (!notificationChannels.has(channel as NotificationChannel)) {
    throw new ApiError("bad_request", "Некорректный канал уведомлений", 400);
  }
}

export async function updateProfileSettingsAction(formData: FormData) {
  try {
    const user = await requireUser();
    const raw = Object.fromEntries(formData.entries());
    const parsed = profileSchema.safeParse(raw);
    if (!parsed.success) {
      throw validationError(parsed.error);
    }
    const data = parsed.data;

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
    throwSafeSettingsError(err, "[updateProfileSettingsAction]", "Не удалось обновить профиль");
  }
}

export async function updatePasswordAction(formData: FormData) {
  try {
    const userSession = await requireUser();
    const parsed = PasswordSettingsSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
      throw validationError(parsed.error);
    }
    const { currentPassword, newPassword } = parsed.data;

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
    throwSafeSettingsError(err, "[updatePasswordAction]", "Не удалось обновить пароль");
  }
}

export async function getNotificationPreferencesAction() {
  try {
    const user = await requireUser();
    return await getUserNotificationPreferences(user.id);
  } catch (err) {
    throwSafeSettingsError(err, "[getNotificationPreferencesAction]", "Не удалось получить настройки уведомлений");
  }
}

export async function updateNotificationPreferencesAction(formData: FormData) {
  try {
    const user = await requireUser();
    const preferencesByChannel = new Map<NotificationChannel, boolean>();

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("notification_")) {
        const channel = key.replace("notification_", "");
        assertNotificationChannel(channel);
        if (value !== "true" && value !== "false") {
          throw new ApiError("bad_request", "Некорректное значение настройки уведомлений", 400);
        }
        preferencesByChannel.set(channel, value === "true");
      }
    }

    const preferences = Array.from(preferencesByChannel, ([channel, enabled]) => ({ channel, enabled }));
    await setNotificationPreferences(user.id, preferences);
    revalidatePath("/*", "layout");
  } catch (err) {
    throwSafeSettingsError(err, "[updateNotificationPreferencesAction]", "Не удалось обновить настройки уведомлений");
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
    throwSafeSettingsError(err, "[incrementBuildVersionAction]", "Не удалось обновить версию сборки");
  }
}

export async function getAppSettingsAction() {
  try {
    await requireUser("settings:manage");
    return await getAllAppSettings();
  } catch (err) {
    throwSafeSettingsError(err, "[getAppSettingsAction]", "Не удалось получить системные настройки");
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
    throwSafeSettingsError(err, "[updateAppSettingsAction]", "Не удалось обновить системные настройки");
  }
}

export async function updateBrandingSettingsAction(formData: FormData) {
  try {
    await requireUser("settings:manage");
    const parsed = BrandingSettingsSchema.safeParse({
      name: formData.get("brand_name"),
      shortName: formData.get("brand_shortName"),
      subtitle: formData.get("brand_subtitle"),
      description: formData.get("brand_description"),
      metadataDescription: formData.get("brand_metadataDescription"),
      logoIcon: formData.get("brand_logoIcon"),
      logoUrl: formData.get("brand_logoUrl"),
      supportEmail: formData.get("brand_supportEmail"),
      primaryColor: formData.get("brand_primaryColor"),
      primaryContainerColor: formData.get("brand_primaryContainerColor"),
      accentColor: formData.get("brand_accentColor"),
      accentContainerColor: formData.get("brand_accentContainerColor"),
      backgroundColor: formData.get("brand_backgroundColor"),
      surfaceColor: formData.get("brand_surfaceColor"),
    });

    if (!parsed.success) {
      throw validationError(parsed.error);
    }

    const branding = parsed.data;
    await setAppSettings({
      [BRANDING_SETTING_KEYS.name]: branding.name,
      [BRANDING_SETTING_KEYS.shortName]: branding.shortName,
      [BRANDING_SETTING_KEYS.subtitle]: branding.subtitle,
      [BRANDING_SETTING_KEYS.description]: branding.description,
      [BRANDING_SETTING_KEYS.metadataDescription]: branding.metadataDescription,
      [BRANDING_SETTING_KEYS.logoIcon]: branding.logoIcon,
      [BRANDING_SETTING_KEYS.logoUrl]: branding.logoUrl,
      [BRANDING_SETTING_KEYS.supportEmail]: branding.supportEmail,
      [BRANDING_SETTING_KEYS.primaryColor]: normalizeHexColor(branding.primaryColor, branding.primaryColor),
      [BRANDING_SETTING_KEYS.primaryContainerColor]: normalizeHexColor(
        branding.primaryContainerColor,
        branding.primaryContainerColor,
      ),
      [BRANDING_SETTING_KEYS.accentColor]: normalizeHexColor(branding.accentColor, branding.accentColor),
      [BRANDING_SETTING_KEYS.accentContainerColor]: normalizeHexColor(
        branding.accentContainerColor,
        branding.accentContainerColor,
      ),
      [BRANDING_SETTING_KEYS.backgroundColor]: normalizeHexColor(branding.backgroundColor, branding.backgroundColor),
      [BRANDING_SETTING_KEYS.surfaceColor]: normalizeHexColor(branding.surfaceColor, branding.surfaceColor),
    });

    revalidatePath("/", "layout");
    revalidatePath("/admin/settings", "layout");
    revalidatePath("/manifest.webmanifest");
  } catch (err) {
    throwSafeSettingsError(err, "[updateBrandingSettingsAction]", "Не удалось обновить бренд платформы");
  }
}
