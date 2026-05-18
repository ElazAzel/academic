import { NextResponse } from "next/server";
import { env } from "@/lib/env";
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
  // Verify cron secret
  const auth = request.headers.get("authorization");
  const expectedSecret = env.CRON_SECRET;

  if (expectedSecret) {
    if (!auth || !auth.startsWith("Bearer ") || auth.slice(7) !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const processed = await processReportJobs(50);

    return NextResponse.json({
      success: true,
      processed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Scheduled Reports] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
