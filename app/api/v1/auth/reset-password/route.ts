import { z } from "zod";
import { ApiError, errorResponse, ok, parseJson } from "@/lib/http";
import { resetPassword } from "@/server/modules/auth/service";
import { checkRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(10).max(128)
});

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await checkRateLimit(`reset-password:${ip}`);
    if (!rl.allowed) {
      return errorResponse(new ApiError("too_many_requests", "Слишком много запросов. Попробуйте позже.", 429));
    }
    const input = await parseJson(request, schema);
    return ok(await resetPassword(input.token, input.password));
  } catch (error) {
    return errorResponse(error);
  }
}

