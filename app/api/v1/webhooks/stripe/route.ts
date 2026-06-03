import { ApiError, errorResponse } from "@/lib/http";
import { STRIPE_WEBHOOK_DISABLED_MESSAGE } from "@/server/modules/billing/service";

/** Stripe-вебхуки отключены. Платформа использует доступ по инвайтам. */
export async function POST() {
  return errorResponse(new ApiError("gone", STRIPE_WEBHOOK_DISABLED_MESSAGE, 410));
}
