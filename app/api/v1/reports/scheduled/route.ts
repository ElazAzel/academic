import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { ApiError, errorResponse, getSafeErrorMetadata } from "@/lib/http";
import { processReportJobs } from "@/server/modules/reports/processor";

/**
 * Scheduled report generation endpoint.
 *
 * Can be triggered by Vercel Cron Jobs, external cron, or pg_cron.
 * Protected by CRON_SECRET.
 *
 * Prefer the unified endpoint `POST /api/v1/outbox/process`
 * which processes both report and notification events in a single call.
 *
 * Usage:
 *   POST /api/v1/reports/scheduled
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: Request) {
  // Verify cron secret — fail CLOSED when unset
  const auth = request.headers.get("authorization");
  const expectedSecret = env.CRON_SECRET;

  if (!expectedSecret) {
    return errorResponse(
      new ApiError(
        "service_unavailable",
        "Сервер не настроен: CRON_SECRET не задан. Обработка отключена.",
        503,
      ),
    );
  }

  if (!auth || !auth.startsWith("Bearer ") || auth.slice(7) !== expectedSecret) {
    return errorResponse(new ApiError("unauthorized", "Недействительный CRON_SECRET", 401));
  }

  try {
    const processed = await processReportJobs(50);

    return NextResponse.json({
      success: true,
      processed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Scheduled Reports] Error", getSafeErrorMetadata(error));
    return errorResponse(new ApiError("internal_error", "Не удалось обработать плановые отчёты", 500));
  }
}
