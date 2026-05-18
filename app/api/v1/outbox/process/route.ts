import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { processReportJobs } from "@/server/modules/reports/processor";
import { processNotificationEvents } from "@/server/modules/notifications/outbox-handler";

/**
 * Unified outbox processor endpoint.
 *
 * Читает все pending события из outbox-таблицы и обрабатывает их по типу:
 * - `report.generate` → генерация отчёта
 * - `notification.send` → создание уведомления + email/push
 *
 * Может вызываться по расписанию:
 * - Vercel Cron Jobs (crons.json)
 * - External cron service (cron-job.org, GitHub Actions, etc.)
 * - pg_cron (PostgreSQL extension)
 *
 * Защищён CRON_SECRET.
 *
 * Usage:
 *   POST /api/v1/outbox/process
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
    const [reportsProcessed, notificationsProcessed] = await Promise.all([
      processReportJobs(50),
      processNotificationEvents(50),
    ]);

    return NextResponse.json({
      success: true,
      reportsProcessed,
      notificationsProcessed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Outbox Processor] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
