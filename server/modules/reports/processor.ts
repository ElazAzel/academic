import { getPrisma } from "@/lib/prisma";
import { dequeuePendingEvents, markFailed } from "@/server/modules/outbox/service";
import { generateReportDownload, getReportUser, parseReportFormat } from "@/server/modules/reports/service";

const prisma = getPrisma();

function byteLength(content: string | Buffer | Uint8Array) {
  if (typeof content === "string") return new TextEncoder().encode(content).byteLength;
  return content.byteLength;
}

export async function processReportJobs(batchSize = 10) {
  const events = await dequeuePendingEvents(batchSize);
  const reportEvents = events.filter((e) => e.eventType === "report.generate");

  for (const event of reportEvents) {
    try {
      const payload = event.payload as { reportType?: string; format?: string; userId?: string };
      const reportType = payload?.reportType;
      const userId = payload?.userId;

      if (!reportType || !payload?.format || !userId) {
        await markFailed(event.id, "Invalid payload: missing reportType, format, or userId");
        continue;
      }

      const user = await getReportUser(userId);
      if (!user) {
        await markFailed(event.id, `Report user not found: ${userId}`);
        continue;
      }

      const report = await generateReportDownload({
        user,
        type: reportType,
        format: parseReportFormat(payload.format),
      });

      const downloadUrl = `/api/v1/reports?type=${report.definition.type}&format=${report.format}`;

      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          payload: {
            ...payload,
            reportType: report.definition.type,
            format: report.format,
            owner: report.definition.owner,
            scope: report.access.scopeLabel,
            downloadUrl,
            filename: report.filename,
            sizeBytes: byteLength(report.content),
          },
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Reports Processor] Failed job ${event.id}:`, msg);
      await markFailed(event.id, msg);
    }
  }

  return reportEvents.length;
}
