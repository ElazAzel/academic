import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export interface AppSettings {
  [key: string]: string | number | boolean | null;
}

const DEFAULT_SETTINGS: AppSettings = {
  FEATURE_PUSH_NOTIFICATIONS: false,
  FEATURE_GRAPHQL: false,
  FEATURE_TELEGRAM_NOTIFICATIONS: false,
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  SMTP_FROM: "AI Strategic Academy <noreply@example.com>",
  CERTIFICATE_COMPLETION_THRESHOLD: 85,
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
    update: { value },
    create: { key, value },
  });
}

export async function setAppSettings(settings: Partial<AppSettings>): Promise<void> {
  await prisma.$transaction(
    Object.entries(settings).map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );
}