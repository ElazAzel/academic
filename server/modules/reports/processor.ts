import { getPrisma } from "@/lib/prisma";
import { dequeuePendingEvents, markFailed } from "@/server/modules/outbox/service";
import { generateReportDownload, getReportUser, parseReportFormat } from "@/server/modules/reports/service";
import { z } from "zod";

const prisma = getPrisma();

const REPORT_PROCESSING_ERROR = "Не удалось сформировать отчет";

const reportJobPayloadSchema = z.object({
  reportType: z.string(),
  format: z.string(),
  userId: z.string(),
});

function byteLength(content: string | Buffer | Uint8Array) {
  if (typeof content === "string") return new TextEncoder().encode(content).byteLength;
  return content.byteLength;
}

export async function processReportJobs(batchSize = 10) {
  const events = await dequeuePendingEvents(batchSize);
  const reportEvents = events.filter((e) => e.eventType === "report.generate");

  for (const event of reportEvents) {
    try {
      const parsed = reportJobPayloadSchema.safeParse(event.payload);
      if (!parsed.success) {
        await markFailed(event.id, "Некорректный payload отчета");
        continue;
      }

      const { reportType, format: rawFormat, userId } = parsed.data;
      const format = parseReportFormat(rawFormat);

      const user = await getReportUser(userId);
      if (!user) {
        await markFailed(event.id, "Пользователь для отчета не найден");
        continue;
      }

      const report = await generateReportDownload({
        user,
        type: reportType,
        format,
      });

      const downloadUrl = `/api/v1/reports?type=${report.definition.type}&format=${report.format}`;

      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          payload: {
            reportType: report.definition.type,
            format: report.format,
            userId,
            owner: report.definition.owner,
            scope: report.access.scopeLabel,
            downloadUrl,
            filename: report.filename,
            sizeBytes: byteLength(report.content),
          },
        },
      });
    } catch (err) {
      console.error(`[Reports Processor] Failed job ${event.id}:`, err);
      await markFailed(event.id, REPORT_PROCESSING_ERROR);
    }
  }

  return reportEvents.length;
}
