import { env } from "@/lib/env";

export type PushProvider = "none" | "firebase" | "telegram";

interface PushPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

let currentProvider: PushProvider = env.FEATURE_PUSH_NOTIFICATIONS ? "firebase" : "none";

export function getPushProvider(): PushProvider {
  return currentProvider;
}

export function setPushProvider(provider: PushProvider) {
  currentProvider = provider;
}

export async function sendPushNotification(payload: PushPayload): Promise<boolean> {
  if (currentProvider === "none") {
    return false;
  }

  if (currentProvider === "firebase") {
    // TODO: Integrate Firebase Admin SDK when push notifications are enabled
    // const message = {
    //   token: payload.token,
    //   notification: { title: payload.title, body: payload.body },
    //   data: payload.data,
    // };
    // await admin.messaging().send(message);
    console.debug("Push notification (firebase) — not yet wired:", payload.title);
    return false;
  }

  if (currentProvider === "telegram" && env.FEATURE_TELEGRAM_NOTIFICATIONS) {
    // TODO: Integrate Telegram Bot API when configured
    console.debug("Push notification (telegram) — not yet wired:", payload.title);
    return false;
  }

  return false;
}
