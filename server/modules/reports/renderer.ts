import { getSafeErrorMetadata } from "@/lib/http";
import {
  fetchAssignmentData,
  fetchCertificateData,
  fetchCuratorWorkloadData,
  fetchProductivityScoreData,
  fetchProgressData,
  fetchRiskData,
  fetchFinalCohortData,
  fetchWeeklyCohortData,
} from "@/lib/reports/data";
import {
  generateAssignmentCsv,
  generateCertificateCsv,
  generateCuratorWorkloadCsv,
  generateProductivityScoreCsv,
  generateProgressCsv,
  generateRiskCsv,
  generateFinalCohortCsv,
  generateWeeklyCohortCsv,
} from "@/lib/reports/csv-generator";
import {
  generateAssignmentXlsx,
  generateCertificateXlsx,
  generateCuratorWorkloadXlsx,
  generateProductivityScoreXlsx,
  generateProgressXlsx,
  generateRiskXlsx,
  generateFinalCohortXlsx,
  generateWeeklyCohortXlsx,
} from "@/lib/reports/xlsx-generator";
import {
  generateAssignmentPdf,
  generateCertificatePdf,
  generateCuratorWorkloadPdf,
  generateProductivityScorePdf,
  generateProgressPdf,
  generateRiskPdf,
  generateFinalCohortPdf,
  generateWeeklyCohortPdf,
} from "@/lib/reports/pdf-generator";
import type { ReportDataScope, ReportFormat, ReportType } from "@/lib/reports/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RenderedReport {
  content: string | Buffer | Uint8Array;
  format: ReportFormat;
  fallbackReason?: string;
}

// ── Row count ─────────────────────────────────────────────────────────────────

async function countRows(type: ReportType, scope: ReportDataScope): Promise<number> {
  const rows = await (async () => {
    switch (type) {
      case "progress":
        return fetchProgressData(scope);
      case "risk":
        return fetchRiskData(scope);
      case "assignments":
        return fetchAssignmentData(scope);
      case "certificates":
        return fetchCertificateData(scope);
      case "curator_workload":
        return fetchCuratorWorkloadData(scope);
      case "productivity_score":
        return fetchProductivityScoreData(scope);
      case "weekly_cohort":
        return fetchWeeklyCohortData(scope);
      case "final_cohort":
        return fetchFinalCohortData(scope);
    }
  })();
  return (rows as unknown[]).length;
}

// ── Render ────────────────────────────────────────────────────────────────────

export async function renderReport(
  type: ReportType,
  format: ReportFormat,
  scope: ReportDataScope,
  fields?: string[],
): Promise<RenderedReport> {
  if (format === "csv") {
    switch (type) {
      case "progress": {
        const rows = await fetchProgressData(scope);
        return { content: generateProgressCsv(rows, fields), format };
      }
      case "risk": {
        const rows = await fetchRiskData(scope);
        return { content: generateRiskCsv(rows, fields), format };
      }
      case "assignments": {
        const rows = await fetchAssignmentData(scope);
        return { content: generateAssignmentCsv(rows, fields), format };
      }
      case "certificates": {
        const rows = await fetchCertificateData(scope);
        return { content: generateCertificateCsv(rows, fields), format };
      }
      case "curator_workload": {
        const rows = await fetchCuratorWorkloadData(scope);
        return { content: generateCuratorWorkloadCsv(rows, fields), format };
      }
      case "productivity_score": {
        const rows = await fetchProductivityScoreData(scope);
        return { content: generateProductivityScoreCsv(rows, fields), format };
      }
      case "final_cohort": {
        const rows = await fetchFinalCohortData(scope);
        return { content: generateFinalCohortCsv(rows, fields), format };
      }
      case "weekly_cohort": {
        const rows = await fetchWeeklyCohortData(scope);
        return { content: generateWeeklyCohortCsv(rows, fields), format };
      }
    }
  }

  // Row-count guardrails: fail early instead of silent OOM/timeout.
  if (format === "pdf") {
    const rowCount = await countRows(type, scope);
    if (rowCount > 2000) {
      console.warn(`[Reports] PDF limit exceeded: ${rowCount} rows, falling back to CSV`);
      const fallback: RenderedReport = await renderReport(type, "csv", scope, fields);
      return { ...fallback, fallbackReason: `PDF поддерживает до 2000 строк. CSV сгенерирован (${rowCount} строк)` };
    }
  }
  if (format === "xlsx") {
    const rowCount = await countRows(type, scope);
    if (rowCount > 50000) {
      console.warn(`[Reports] XLSX limit exceeded: ${rowCount} rows, falling back to CSV`);
      const fallback: RenderedReport = await renderReport(type, "csv", scope, fields);
      return { ...fallback, fallbackReason: `XLSX поддерживает до 50 000 строк. CSV сгенерирован (${rowCount} строк)` };
    }
  }

  try {
    if (format === "xlsx") {
      switch (type) {
        case "progress": {
          const rows = await fetchProgressData(scope);
          return { content: await generateProgressXlsx(rows, fields), format };
        }
        case "risk": {
          const rows = await fetchRiskData(scope);
          return { content: await generateRiskXlsx(rows, fields), format };
        }
        case "assignments": {
          const rows = await fetchAssignmentData(scope);
          return { content: await generateAssignmentXlsx(rows, fields), format };
        }
        case "certificates": {
          const rows = await fetchCertificateData(scope);
          return { content: await generateCertificateXlsx(rows, fields), format };
        }
        case "curator_workload": {
          const rows = await fetchCuratorWorkloadData(scope);
          return { content: await generateCuratorWorkloadXlsx(rows, fields), format };
        }
        case "productivity_score": {
          const rows = await fetchProductivityScoreData(scope);
          return { content: await generateProductivityScoreXlsx(rows, fields), format };
        }
        case "final_cohort": {
          const rows = await fetchFinalCohortData(scope);
          return { content: await generateFinalCohortXlsx(rows, fields), format };
        }
        case "weekly_cohort": {
          const rows = await fetchWeeklyCohortData(scope);
          return { content: await generateWeeklyCohortXlsx(rows, fields), format };
        }
      }
    }

    switch (type) {
      case "progress": {
        const rows = await fetchProgressData(scope);
        return { content: await generateProgressPdf(rows, fields), format };
      }
      case "risk": {
        const rows = await fetchRiskData(scope);
        return { content: await generateRiskPdf(rows, fields), format };
      }
      case "assignments": {
        const rows = await fetchAssignmentData(scope);
        return { content: await generateAssignmentPdf(rows, fields), format };
      }
      case "certificates": {
        const rows = await fetchCertificateData(scope);
        return { content: await generateCertificatePdf(rows, fields), format };
      }
      case "curator_workload": {
        const rows = await fetchCuratorWorkloadData(scope);
        return { content: await generateCuratorWorkloadPdf(rows, fields), format };
      }
      case "productivity_score": {
        const rows = await fetchProductivityScoreData(scope);
        return { content: await generateProductivityScorePdf(rows, fields), format };
      }
      case "final_cohort": {
        const rows = await fetchFinalCohortData(scope);
        return { content: await generateFinalCohortPdf(rows, fields), format };
      }
      case "weekly_cohort": {
        const rows = await fetchWeeklyCohortData(scope);
        return { content: await generateWeeklyCohortPdf(rows, fields), format };
      }
    }
  } catch (error) {
    console.warn("[Reports] Report generation failed, falling back to CSV", {
      format,
      ...getSafeErrorMetadata(error),
    });
    const fallback: RenderedReport = await renderReport(type, "csv", scope, fields);
    return {
      ...fallback,
      fallbackReason: `${format.toUpperCase()} не удалось сформировать. Вместо него выдан CSV.`,
    };
  }

  // Unreachable — all types/formats handled above
  throw new Error(`Unhandled report type/format: ${type}/${format}`);
}
