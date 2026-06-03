import { describe, expect, it } from "vitest";
import {
  BILLING_DISABLED_MESSAGE,
  STRIPE_WEBHOOK_DISABLED_MESSAGE,
} from "@/server/modules/billing/service";
import { POST as createCheckoutResponse } from "@/app/api/v1/payments/checkout/route";
import { POST as createStripeWebhookResponse } from "@/app/api/v1/webhooks/stripe/route";

describe("Disabled billing endpoints", () => {
  it("keeps Stripe webhooks disabled for invite-only access", async () => {
    const billingModule = await import("@/server/modules/billing/service");
    await expect(billingModule.handleStripeWebhook()).rejects.toMatchObject({
      code: "gone",
      message: STRIPE_WEBHOOK_DISABLED_MESSAGE,
      status: 410
    });
  });

  it("keeps checkout disabled for invite-only access", async () => {
    const billingModule = await import("@/server/modules/billing/service");
    await expect(billingModule.createCheckoutSession()).rejects.toMatchObject({
      code: "gone",
      message: BILLING_DISABLED_MESSAGE,
      status: 410
    });
  });

  it("returns Russian 410 payloads from disabled route handlers", async () => {
    const checkoutResponse = await createCheckoutResponse();
    const checkoutPayload = await checkoutResponse.json();
    const stripeResponse = await createStripeWebhookResponse();
    const stripePayload = await stripeResponse.json();

    expect(checkoutResponse.status).toBe(410);
    expect(checkoutPayload.error).toMatchObject({
      code: "gone",
      message: BILLING_DISABLED_MESSAGE,
    });
    expect(stripeResponse.status).toBe(410);
    expect(stripePayload.error).toMatchObject({
      code: "gone",
      message: STRIPE_WEBHOOK_DISABLED_MESSAGE,
    });
  });
});
