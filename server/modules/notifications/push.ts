import webpush from "web-push";
import { env } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export interface WebPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, string>;
}

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  const email = env.VAPID_EMAIL;

  if (!publicKey || !privateKey) {
    console.warn("[Push] VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars.");
    console.warn("[Push] Generate keys with: npx web-push generate-vapid-keys");
    return false;
  }

  webpush.setVapidDetails(
    `mailto:${email || "admin@academy.local"}`,
    publicKey,
    privateKey,
  );

  vapidConfigured = true;
  return true;
}

/**
 * Send a Web Push notification to a specific subscription.
 *
 * Uses the Web Push Protocol with VAPID authentication.
 * Returns true if the push was sent successfully.
 * Returns false and deactivates the subscription if it's expired (410 Gone).
 */
export async function sendPushToSubscription(
  subscription: WebPushSubscription,
  payload: PushPayload,
): Promise<boolean> {
  if (!env.FEATURE_PUSH_NOTIFICATIONS) return false;
  if (!ensureVapidConfigured()) return false;

  const pushSubscription: webpush.PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  const jsonPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
    tag: payload.tag,
    ...payload.data,
  });

  try {
    await webpush.sendNotification(pushSubscription, jsonPayload, {
      TTL: 60 * 60, // 1 hour
      urgency: "normal",
    });
    return true;
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;

    if (statusCode === 410 || statusCode === 404) {
      // Subscription expired or invalid — deactivate it
      console.log("[Push] Subscription expired, deactivating", { statusCode });
      try {
        await prisma.pushSubscription.updateMany({
          where: { endpoint: subscription.endpoint },
          data: { active: false },
        });
      } catch {
        // Ignore DB errors during cleanup
      }
      return false;
    }

    console.error("[Push] Send failed", {
      statusCode,
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return false;
  }
}

/**
 * Send push notification to all active subscriptions for a user.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!env.FEATURE_PUSH_NOTIFICATIONS) return 0;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, active: true },
  });

  if (subscriptions.length === 0) return 0;

  let sent = 0;
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      sendPushToSubscription(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
      ),
    ),
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      sent++;
    }
  }

  return sent;
}
