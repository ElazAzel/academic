import { describe, expect, it, vi } from "vitest";

describe("Stripe webhook handler", () => {
  it("keeps webhook verification mandatory", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    const billingModule = await import("@/server/modules/billing/service");
    await expect(billingModule.handleStripeWebhook("{}", null)).rejects.toThrow("Stripe webhook is not configured");
  });
});
