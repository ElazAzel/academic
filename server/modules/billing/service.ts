/**
 * Billing module — DEPRECATED.
 *
 * Платформа использует инвайт-доступ (invite links + assigned credentials).
 * Stripe/payments удалены из Prisma schema.
 * Этот файл остаётся как пустой placeholder, чтобы не ломать
 * существующие импорты в API routes, пока те не будут удалены.
 */

export async function createCheckoutSession(_input: unknown) {
  throw new Error("Payments are disabled. Use invite links for access.");
}

export async function handleStripeWebhook(_rawBody: string, _signature: string | null) {
  throw new Error("Payments are disabled. Stripe webhooks are not supported.");
}
