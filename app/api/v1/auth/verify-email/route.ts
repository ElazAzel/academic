import { z } from "zod";
import { ApiError, errorResponse, ok, parseJson } from "@/lib/http";
import { verifyEmail } from "@/server/modules/auth/service";
import { checkRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({ token: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const rl = await checkRateLimit("verify-email");
    if (!rl.allowed) {
      return errorResponse(new ApiError("too_many_requests", "Слишком много запросов. Попробуйте позже.", 429));
    }
    const input = await parseJson(request, schema);
    return ok(await verifyEmail(input.token));
  } catch (error) {
    return errorResponse(error);
  }
}

