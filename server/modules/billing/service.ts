import Stripe from "stripe";
import { PaymentStatus, PaymentType } from "@prisma/client";
import { env } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { toJsonValue } from "@/lib/json";
import { logAudit } from "@/server/modules/audit/service";

const prisma = getPrisma();

let stripeClient: Stripe | null = null;

function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    if (env.NODE_ENV === "production") {
      throw new ApiError("internal_error", "Stripe secret is not configured", 500);
    }
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" });
  }
  return stripeClient;
}

export async function createCheckoutSession(input: {
  userId: string;
  courseId: string;
  priceCents: number;
  currency: string;
  type: PaymentType;
}) {
  const course = await prisma.course.findUnique({ where: { id: input.courseId } });
  if (!course) {
    throw new ApiError("not_found", "Курс не найден", 404);
  }
  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      courseId: input.courseId,
      amountCents: input.priceCents,
      currency: input.currency,
      type: input.type,
      status: PaymentStatus.PENDING
    }
  });

  const stripe = getStripe();
  if (!stripe) {
    return {
      paymentId: payment.id,
      checkoutUrl: `${env.APP_URL}/student/my-courses?mockCheckout=${payment.id}`,
      mode: "mock"
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: input.type === PaymentType.SUBSCRIPTION ? "subscription" : "payment",
    success_url: env.STRIPE_SUCCESS_URL,
    cancel_url: env.STRIPE_CANCEL_URL,
    customer_email: undefined,
    client_reference_id: input.userId,
    metadata: { paymentId: payment.id, courseId: input.courseId, userId: input.userId },
    line_items: [
      {
        price_data: {
          currency: input.currency,
          unit_amount: input.priceCents,
          product_data: { name: course.title },
          ...(input.type === PaymentType.SUBSCRIPTION ? { recurring: { interval: "month" as const } } : {})
        },
        quantity: 1
      }
    ]
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripeCheckoutSessionId: session.id, raw: toJsonValue(session) }
  });
  await logAudit({ actorId: input.userId, action: "payment.checkout_created", entity: "payment", entityId: payment.id });
  return { paymentId: payment.id, checkoutUrl: session.url, mode: "stripe" };
}

export async function handleStripeWebhook(rawBody: string, signature: string | null) {
  const stripe = getStripe();
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    throw new ApiError("internal_error", "Stripe webhook is not configured", 500);
  }
  if (!signature) {
    throw new ApiError("bad_request", "Missing Stripe signature", 400);
  }
  const event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.paymentId;
    if (paymentId) {
      const payment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.PAID,
          stripeCheckoutSessionId: session.id,
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
          raw: toJsonValue(session)
        }
      });
      if (payment.userId && payment.courseId) {
        await prisma.enrollment.upsert({
          where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } },
          update: { status: "ACTIVE" },
          create: { userId: payment.userId, courseId: payment.courseId, status: "ACTIVE" }
        });
      }
      await logAudit({ actorId: payment.userId, action: "payment.paid", entity: "payment", entityId: payment.id });
    }
  }
  return { received: true, type: event.type };
}
