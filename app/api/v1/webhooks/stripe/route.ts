import { errorResponse, ok } from "@/lib/http";
import { handleStripeWebhook } from "@/server/modules/billing/service";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");
    return ok(await handleStripeWebhook(rawBody, signature));
  } catch (error) {
    return errorResponse(error);
  }
}

