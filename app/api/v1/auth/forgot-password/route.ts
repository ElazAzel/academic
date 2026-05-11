import { z } from "zod";
import { ApiError, errorResponse, ok, parseJson } from "@/lib/http";
import { requestPasswordReset } from "@/server/modules/auth/service";
import { checkRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, schema);
    const rl = await checkRateLimit(`forgot-password:${input.email}`);
    if (!rl.allowed) {
      return errorResponse(new ApiError("too_many_requests", "Слишком много запросов. Попробуйте позже.", 429));
    }
    return ok(await requestPasswordReset(input.email));
  } catch (error) {
    return errorResponse(error);
  }
}

