import { getPrisma } from "@/lib/prisma";
import { toJsonValue } from "@/lib/json";
import { BRANDING } from "@/lib/branding";

const prisma = getPrisma();

export interface AppSettings {
  [key: string]: string | number | boolean | null;
}

const DEFAULT_SETTINGS: AppSettings = {
  FEATURE_PUSH_NOTIFICATIONS: false,
  FEATURE_GRAPHQL: false,
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  SMTP_FROM: `${BRANDING.name} <noreply@example.com>`,
  CERTIFICATE_COMPLETION_THRESHOLD: 85,
  BUILD_VERSION: 1,
  BRAND_NAME: BRANDING.name,
  BRAND_SHORT_NAME: BRANDING.shortName,
  BRAND_SUBTITLE: BRANDING.subtitle,
  BRAND_DESCRIPTION: BRANDING.description,
  BRAND_METADATA_DESCRIPTION: BRANDING.metadataDescription,
  BRAND_LOGO_ICON: BRANDING.logoIcon,
  BRAND_LOGO_URL: BRANDING.logoUrl,
  BRAND_SUPPORT_EMAIL: BRANDING.supportEmail,
  BRAND_PRIMARY_COLOR: BRANDING.primaryColor,
  BRAND_PRIMARY_CONTAINER_COLOR: BRANDING.primaryContainerColor,
  BRAND_ACCENT_COLOR: BRANDING.accentColor,
  BRAND_ACCENT_CONTAINER_COLOR: BRANDING.accentContainerColor,
  BRAND_BACKGROUND_COLOR: BRANDING.backgroundColor,
  BRAND_SURFACE_COLOR: BRANDING.surfaceColor,
};

export async function getAppSetting<T>(key: string, defaultValue: T): Promise<T> {
  const setting = await prisma.appSetting.findUnique({
    where: { key },
  });
  if (!setting) return defaultValue;
  return setting.value as T;
}

export async function getAllAppSettings(): Promise<AppSettings> {
  const settings = await prisma.appSetting.findMany();
  const result: AppSettings = { ...DEFAULT_SETTINGS };
  for (const s of settings) {
    result[s.key] = s.value as string | number | boolean | null;
  }
  return result;
}

export async function setAppSetting(key: string, value: string | number | boolean | null): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value: toJsonValue(value) },
    create: { key, value: toJsonValue(value) },
  });
}

export async function setAppSettings(settings: Partial<AppSettings>): Promise<void> {
  await prisma.$transaction(
    Object.entries(settings).map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        update: { value: toJsonValue(value) },
        create: { key, value: toJsonValue(value) },
      })
    )
  );
}
