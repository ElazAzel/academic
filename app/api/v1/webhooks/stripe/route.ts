import { errorResponse } from "@/lib/http";

/** Stripe webhooks are disabled. The platform uses invite-based access. */
export async function POST() {
  return errorResponse(new Error("Stripe webhooks are disabled."));
}
