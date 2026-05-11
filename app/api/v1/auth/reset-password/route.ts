import { z } from "zod";
import { ApiError, errorResponse, ok, parseJson } from "@/lib/http";
import { resetPassword } from "@/server/modules/auth/service";
import { checkRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(10).max(128)
});

export async function POST(request: Request) {
  try {
    const rl = await checkRateLimit("reset-password");
    if (!rl.allowed) {
      return errorResponse(new ApiError("too_many_requests", "Слишком много запросов. Попробуйте позже.", 429));
    }
    const input = await parseJson(request, schema);
    return ok(await resetPassword(input.token, input.password));
  } catch (error) {
    return errorResponse(error);
  }
}

