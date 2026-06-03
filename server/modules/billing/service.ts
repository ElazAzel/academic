import { ApiError } from "@/lib/http";

export const BILLING_DISABLED_MESSAGE =
  "Платежи отключены для закрытой академии. Используйте выданные инвайт-ссылки для доступа.";
export const STRIPE_WEBHOOK_DISABLED_MESSAGE =
  "Stripe-вебхуки отключены для закрытой академии.";

export async function createCheckoutSession() {
  throw new ApiError("gone", BILLING_DISABLED_MESSAGE, 410);
}

export async function handleStripeWebhook() {
  throw new ApiError("gone", STRIPE_WEBHOOK_DISABLED_MESSAGE, 410);
}
