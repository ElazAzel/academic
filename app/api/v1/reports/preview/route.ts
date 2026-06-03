import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { ApiError, errorResponse, getSafeErrorMetadata } from "@/lib/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { generateReportPreview } from "@/server/modules/reports/service";

export async function GET(request: Request) {
  try {
    const user = await requireUser("reports:read");
    const { searchParams } = new URL(request.url);

    const rl = await checkRateLimit(`reports:preview:${user.id}`);
    if (!rl.allowed) {
      throw new ApiError("too_many_requests", "Слишком много запросов. Попробуйте позже.", 429);
    }

    const reportType = searchParams.get("type");
    const preview = await generateReportPreview({
      user,
      type: reportType,
    });

    return NextResponse.json({ data: preview });
  } catch (err) {
    if (!(err instanceof ApiError)) {
      console.error("[Reports Preview API] Error", getSafeErrorMetadata(err));
    }
    return errorResponse(err);
  }
}
