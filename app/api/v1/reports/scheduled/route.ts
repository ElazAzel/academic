import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { processReportJobs } from "@/server/modules/reports/processor";

/**
 * Scheduled report generation endpoint.
 *
 * Can be triggered by:
 * - Vercel Cron Jobs (crons.json)
 * - External cron service (cron-job.org, GitHub Actions, etc.)
 * - pg_cron (PostgreSQL extension)
 *
 * Protected by CRON_SECRET env variable.
 *
 * Usage:
 *   POST /api/v1/reports/scheduled
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Vercel crons.json example:
 * ```json
 * {
 *   "crons": [
 *     {
 *       "path": "/api/v1/reports/scheduled",
 *       "schedule": "0 6 * * 1"
 *     }
 *   ]
 * }
 * ```
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
