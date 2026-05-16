import { getPrisma } from "@/lib/prisma";
import { dequeuePendingEvents, markFailed } from "@/server/modules/outbox/service";
import { fetchProgressData, fetchRiskData, fetchCertificateData } from "@/lib/reports/data";
import { generateProgressCsv, generateRiskCsv, generateCertificateCsv } from "@/lib/reports/csv-generator";
import { generateProgressXlsx, generateRiskXlsx, generateCertificateXlsx } from "@/lib/reports/xlsx-generator";
import { generateProgressPdf, generateRiskPdf, generateCertificatePdf } from "@/lib/reports/pdf-generator";
import type { ReportFormat } from "@/lib/reports/types";

const prisma = getPrisma();

type GeneratorOutput = string | Uint8Array | Buffer;

const generators: Record<string, Record<ReportFormat, (rows: unknown[]) => Promise<GeneratorOutput>>> = {
  progress: {
    csv: async (rows) => generateProgressCsv(rows as never[]),
    xlsx: async (rows) => generateProgressXlsx(rows as never[]),
    pdf: async (rows) => generateProgressPdf(rows as never[]),
  },
  risk: {
    csv: async (rows) => generateRiskCsv(rows as never[]),
    xlsx: async (rows) => generateRiskXlsx(rows as never[]),
    pdf: async (rows) => generateRiskPdf(rows as never[]),
  },
  certificates: {
    csv: async (rows) => generateCertificateCsv(rows as never[]),
    xlsx: async (rows) => generateCertificateXlsx(rows as never[]),
    pdf: async (rows) => generateCertificatePdf(rows as never[]),
  },
};

const dataFetchers: Record<string, (scopedIds?: string[]) => Promise<never[]>> = {
  progress: fetchProgressData as never,
  risk: fetchRiskData as never,
  certificates: fetchCertificateData as never,
};

export async function processReportJobs(batchSize = 10) {
  const events = await dequeuePendingEvents(batchSize);
  const reportEvents = events.filter((e) => e.eventType === "report.generate");

  for (const event of reportEvents) {
    try {
      const payload = event.payload as { reportType?: string; format?: string; userId?: string };
      const reportType = payload?.reportType;
      const format = payload?.format as ReportFormat | undefined;
      const userId = payload?.userId;

      if (!reportType || !format || !userId) {
        await markFailed(event.id, "Invalid payload: missing reportType, format, or userId");
        continue;
      }

      if (!generators[reportType] || !generators[reportType][format]) {
        await markFailed(event.id, `Unsupported report type/format: ${reportType}/${format}`);
        continue;
      }

      const fetcher = dataFetchers[reportType];
      const rows = await fetcher();
      const result = await generators[reportType][format](rows);

      const blob = result instanceof Uint8Array ? result : new TextEncoder().encode(result);

      const filename = `${reportType}_report_${Date.now()}.${format}`;
      const downloadUrl = `/api/v1/reports?type=${reportType}&format=${format}`;

      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          payload: { ...payload, downloadUrl, filename, sizeBytes: blob.length },
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
