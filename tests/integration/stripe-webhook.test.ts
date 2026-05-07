import { describe, expect, it } from "vitest";

describe("Disabled billing endpoints", () => {
  it("keeps Stripe webhooks disabled for invite-only access", async () => {
    const billingModule = await import("@/server/modules/billing/service");
    await expect(billingModule.handleStripeWebhook()).rejects.toMatchObject({
      code: "gone",
      status: 410
    });
  });

  it("keeps checkout disabled for invite-only access", async () => {
    const billingModule = await import("@/server/modules/billing/service");
    await expect(billingModule.createCheckoutSession()).rejects.toMatchObject({
      code: "gone",
      status: 410
    });
  });
});
