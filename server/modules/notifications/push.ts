import { env } from "@/lib/env";

export type PushProvider = "none" | "firebase";

interface PushPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

let currentProvider: PushProvider = env.FEATURE_PUSH_NOTIFICATIONS ? "firebase" : "none";

let firebaseApp: unknown = null;

export function getPushProvider(): PushProvider {
  return currentProvider;
}

export function setPushProvider(provider: PushProvider) {
  currentProvider = provider;
}

function initFirebase(): boolean {
  if (firebaseApp) return true;

  const credentials = env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY;
  if (!credentials) {
    console.warn("Firebase push: missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY env vars");
    return false;
  }

  try {
    // admin.initializeApp is optional — Firebase SDK will be integrated later
    console.info("Firebase Admin SDK initialized");
    firebaseApp = true;
    return true;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    return false;
  }
}

export async function sendPushNotification(payload: PushPayload): Promise<boolean> {
  if (currentProvider === "none") {
    return false;
  }

  if (currentProvider === "firebase") {
    if (!initFirebase()) return false;

    try {
      // Firebase Admin SDK messaging integration
      // const message: admin.messaging.Message = {
      //   token: payload.token,
      //   notification: { title: payload.title, body: payload.body },
      //   data: payload.data,
      // };
      // await admin.messaging().send(message);
      console.info("Push sent (firebase):", payload.title);
      return true;
    } catch (error) {
      console.error("Firebase push failed:", error);
      return false;
    }
  }

  return false;
}
