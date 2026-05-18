import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { acceptConsent } from "@/server/modules/consent/service";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;
    await acceptConsent(user.id, ipAddress, userAgent);
    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
