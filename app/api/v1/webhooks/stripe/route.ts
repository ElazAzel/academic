import { ApiError, errorResponse } from "@/lib/http";

/** Stripe webhooks are disabled. The platform uses invite-based access. */
export async function POST() {
  return errorResponse(new ApiError("gone", "Stripe webhooks are disabled for the invite-only academy profile.", 410));
}
