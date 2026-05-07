import { ApiError } from "@/lib/http";

const disabledMessage = "Payments are disabled for the invite-only academy profile. Use invite links for access.";

export async function createCheckoutSession() {
  throw new ApiError("gone", disabledMessage, 410);
}

export async function handleStripeWebhook() {
  throw new ApiError("gone", "Stripe webhooks are disabled for the invite-only academy profile.", 410);
}
