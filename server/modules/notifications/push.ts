import { env } from "@/lib/env";

export type PushProvider = "none" | "firebase";

interface PushPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

let currentProvider: PushProvider = env.FEATURE_PUSH_NOTIFICATIONS ? "firebase" : "none";

/**
 * Send push notification via Firebase Admin SDK.
 *
 * Реальная отправка Firebase работает только если:
 * 1. FEATURE_PUSH_NOTIFICATIONS=true
 * 2. FIREBASE_CLIENT_EMAIL и FIREBASE_PRIVATE_KEY заданы
 * 3. Firebase Admin SDK установлен и инициализирован
 *
 * Если push не настроен, функция возвращает false без ошибки.
 */
export async function sendPushNotification(payload: PushPayload): Promise<boolean> {
  if (currentProvider === "none") {
    return false;
  }

  if (currentProvider === "firebase") {
    try {
      // Динамический импорт для опциональной зависимости
      // Используем Function() для обхода статического анализа TypeScript
      const adminMod: unknown = await new Function('return import("firebase-admin")')().catch(() => null);
      if (!adminMod) {
        console.warn("[Push] firebase-admin package not installed. Install with: npm install firebase-admin");
        currentProvider = "none";
        return false;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const admin = adminMod as any;

      if (!admin.apps || !admin.apps.length) {
        const clientEmail = env.FIREBASE_CLIENT_EMAIL;
        const privateKey = env.FIREBASE_PRIVATE_KEY;
        const projectId = env.FIREBASE_PROJECT_ID;

        if (!clientEmail || !privateKey || !projectId) {
          console.warn("[Push] Firebase не настроен: отсутствуют FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY или FIREBASE_PROJECT_ID");
          currentProvider = "none";
          return false;
        }

        admin.initializeApp({
          credential: admin.credential.cert({
            clientEmail,
            privateKey,
            projectId,
          }),
        });
      }

      await admin.messaging().send({
        token: payload.token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Push] Firebase send failed:", message);
      return false;
    }
  }

  return false;
}
