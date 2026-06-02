import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { ApiError, errorResponse, parseJson } from "@/lib/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";

const prisma = getPrisma();

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser().catch(() => null);
    if (!user) {
      // Not authenticated — skip silently (PWA registers on every page including login)
      return NextResponse.json({ success: false, reason: "unauthenticated" });
    }

    const rl = await checkRateLimit(`push-subscribe:${user.id}`);
    if (!rl.allowed) {
      throw new ApiError("too_many_requests", "Слишком много запросов. Попробуйте позже.", 429);
    }

    const input = await parseJson(request, subscriptionSchema);

    // Upsert: one subscription per endpoint per user
    await prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      update: {
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        active: true,
      },
      create: {
        userId: user.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ success: false, reason: "unauthenticated" });
    }

    const input = await parseJson(request, unsubscribeSchema);

    await prisma.pushSubscription.updateMany({
      where: { userId: user.id, endpoint: input.endpoint },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
