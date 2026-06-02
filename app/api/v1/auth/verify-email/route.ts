import { createHash } from "node:crypto";
import { z } from "zod";
import { ApiError, errorResponse, ok, parseJson } from "@/lib/http";
import { verifyEmail } from "@/server/modules/auth/service";
import { checkRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({ token: z.string().trim().min(1, "Укажите токен подтверждения") });

function rateLimitKeyForToken(token: string) {
  const digest = createHash("sha256").update(token).digest("hex").slice(0, 24);
  return `verify-email:${digest}`;
}

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, schema);
    const rl = await checkRateLimit(rateLimitKeyForToken(input.token));
    if (!rl.allowed) {
      return errorResponse(new ApiError("too_many_requests", "Слишком много запросов. Попробуйте позже.", 429));
    }
    return ok(await verifyEmail(input.token));
  } catch (error) {
    return errorResponse(error);
  }
}
