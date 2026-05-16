import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/http";
import { reportCache } from "@/lib/cache";
import { fetchProgressData, fetchRiskData, fetchCertificateData } from "@/lib/reports/data";
import { generateProgressCsv, generateRiskCsv, generateCertificateCsv } from "@/lib/reports/csv-generator";
import { generateProgressXlsx, generateRiskXlsx, generateCertificateXlsx } from "@/lib/reports/xlsx-generator";
import { generateProgressPdf, generateRiskPdf, generateCertificatePdf } from "@/lib/reports/pdf-generator";
import { getScopedStudentIdsForObserver } from "@/server/modules/observer/scope";
import type { ReportFormat } from "@/lib/reports/types";

const prisma = getPrisma();

const MIME: Record<ReportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

const EXT: Record<ReportFormat, string> = {
  csv: ".csv",
  xlsx: ".xlsx",
  pdf: ".pdf",
};

function respond(content: string | Buffer | Uint8Array | ArrayBuffer, format: ReportFormat, filename: string) {
  const isBinary = format === "pdf" || format === "xlsx";

  let body: BodyInit;
  if (typeof content === "string") {
    body = content;
  } else if (isBinary) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body = new Blob([content as any], { type: MIME[format] });
  } else if (Buffer.isBuffer(content)) {
    body = content.toString();
  } else if (content instanceof Uint8Array) {
    body = new TextDecoder().decode(content);
  } else {
    body = new TextDecoder().decode(new Uint8Array(content));
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": MIME[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const isAdmin = user.roles.includes("admin");
    const isSuperCurator = user.roles.includes("super_curator");
    const isCurator = user.roles.includes("curator");
    const isObserver = user.roles.includes("customer_observer");
    const isInstructor = user.roles.includes("instructor");

    if (!isAdmin && !isSuperCurator && !isCurator && !isObserver && !isInstructor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const format = (searchParams.get("format") || "csv") as ReportFormat;

    if (!["csv", "xlsx", "pdf"].includes(format)) {
      return NextResponse.json({ error: "Unsupported format. Use csv, xlsx, or pdf." }, { status: 400 });
    }

    const getScopedStudentIds = async () => {
      if (isAdmin) return undefined;
      if (isCurator) {
        const assignments = await prisma.curatorAssignment.findMany({
          where: { curatorId: user.id, active: true },
          select: { studentId: true },
        });
        return assignments.map((a) => a.studentId);
      }
      if (isSuperCurator) {
        const assignments = await prisma.curatorAssignment.findMany({
          where: { superCuratorId: user.id, active: true },
          select: { studentId: true },
        });
        return assignments.map((a) => a.studentId);
      }
      if (isInstructor) {
        const courses = await prisma.course.findMany({
          where: { instructors: { some: { userId: user.id } } },
          select: { id: true },
        });
        const courseIds = courses.map((c) => c.id);
        if (courseIds.length === 0) return [];
        const enrollments = await prisma.enrollment.findMany({
          where: { courseId: { in: courseIds }, status: "ACTIVE" },
          select: { userId: true },
        });
        return [...new Set(enrollments.map((e) => e.userId))];
      }
      if (isObserver) {
        return getScopedStudentIdsForObserver(user.id);
      }
      return undefined;
    };

    const scopedIds = await getScopedStudentIds();

    if (type === "progress" || type === "curator_progress") {
      const cacheKey = `report:${type}:${format}:${user.id}`;
      const cached = reportCache.get<{ content: string | Uint8Array; format: ReportFormat; filename: string }>(cacheKey);
      if (cached) return respond(cached.content, cached.format, cached.filename);

      const rows = await fetchProgressData(scopedIds);
      const filename = `${type}_report${EXT[format]}`;

      if (format === "xlsx") {
        try {
          const content = await generateProgressXlsx(rows);
          reportCache.set(cacheKey, { content, format, filename });
          return respond(content, format, filename);
        } catch (err) {
          console.warn(`[Reports] ${format} generation failed, falling back to CSV:`, err);
          const fallbackContent = generateProgressCsv(rows);
          reportCache.set(cacheKey, { content: fallbackContent, format: "csv", filename: filename.replace(/\.xlsx$/, ".csv") });
          const response = respond(fallbackContent, "csv", filename.replace(/\.xlsx$/, ".csv"));
          response.headers.set("X-Fallback-Reason", `${format} generation failed, CSV provided instead`);
          return response;
        }
      }
      if (format === "pdf") {
        try {
          const content = await generateProgressPdf(rows);
          reportCache.set(cacheKey, { content, format, filename });
          return respond(content, format, filename);
        } catch (err) {
          console.warn(`[Reports] ${format} generation failed, falling back to CSV:`, err);
          const fallbackContent = generateProgressCsv(rows);
          reportCache.set(cacheKey, { content: fallbackContent, format: "csv", filename: filename.replace(/\.pdf$/, ".csv") });
          const response = respond(fallbackContent, "csv", filename.replace(/\.pdf$/, ".csv"));
          response.headers.set("X-Fallback-Reason", `${format} generation failed, CSV provided instead`);
          return response;
        }
      }
      const content = generateProgressCsv(rows);
      reportCache.set(cacheKey, { content, format, filename });
      return respond(content, format, filename);
    }

    if (type === "risk" || type === "curator_risk") {
      const cacheKey = `report:${type}:${format}:${user.id}`;
      const cached = reportCache.get<{ content: string | Uint8Array; format: ReportFormat; filename: string }>(cacheKey);
      if (cached) return respond(cached.content, cached.format, cached.filename);

      const rows = await fetchRiskData(scopedIds);
      const filename = `${type}_report${EXT[format]}`;

      if (format === "xlsx") {
        try {
          const content = await generateRiskXlsx(rows);
          reportCache.set(cacheKey, { content, format, filename });
          return respond(content, format, filename);
        } catch (err) {
          console.warn(`[Reports] ${format} generation failed, falling back to CSV:`, err);
          const fallbackContent = generateRiskCsv(rows);
          reportCache.set(cacheKey, { content: fallbackContent, format: "csv", filename: filename.replace(/\.xlsx$/, ".csv") });
          const response = respond(fallbackContent, "csv", filename.replace(/\.xlsx$/, ".csv"));
          response.headers.set("X-Fallback-Reason", `${format} generation failed, CSV provided instead`);
          return response;
        }
      }
      if (format === "pdf") {
        try {
          const content = await generateRiskPdf(rows);
          reportCache.set(cacheKey, { content, format, filename });
          return respond(content, format, filename);
        } catch (err) {
          console.warn(`[Reports] ${format} generation failed, falling back to CSV:`, err);
          const fallbackContent = generateRiskCsv(rows);
          reportCache.set(cacheKey, { content: fallbackContent, format: "csv", filename: filename.replace(/\.pdf$/, ".csv") });
          const response = respond(fallbackContent, "csv", filename.replace(/\.pdf$/, ".csv"));
          response.headers.set("X-Fallback-Reason", `${format} generation failed, CSV provided instead`);
          return response;
        }
      }
      const content = generateRiskCsv(rows);
      reportCache.set(cacheKey, { content, format, filename });
      return respond(content, format, filename);
    }

    if (type === "certificates") {
      const cacheKey = `report:${type}:${format}`;
      const cached = reportCache.get<{ content: string | Uint8Array; format: ReportFormat; filename: string }>(cacheKey);
      if (cached) return respond(cached.content, cached.format, cached.filename);

      const rows = await fetchCertificateData();
      const filename = `certificates_report${EXT[format]}`;

      if (format === "xlsx") {
        try {
          const content = await generateCertificateXlsx(rows);
          reportCache.set(cacheKey, { content, format, filename });
          return respond(content, format, filename);
        } catch (err) {
          console.warn(`[Reports] ${format} generation failed, falling back to CSV:`, err);
          const fallbackContent = generateCertificateCsv(rows);
          reportCache.set(cacheKey, { content: fallbackContent, format: "csv", filename: filename.replace(/\.xlsx$/, ".csv") });
          const response = respond(fallbackContent, "csv", filename.replace(/\.xlsx$/, ".csv"));
          response.headers.set("X-Fallback-Reason", `${format} generation failed, CSV provided instead`);
          return response;
        }
      }
      if (format === "pdf") {
        try {
          const content = await generateCertificatePdf(rows);
          reportCache.set(cacheKey, { content, format, filename });
          return respond(content, format, filename);
        } catch (err) {
          console.warn(`[Reports] ${format} generation failed, falling back to CSV:`, err);
          const fallbackContent = generateCertificateCsv(rows);
          reportCache.set(cacheKey, { content: fallbackContent, format: "csv", filename: filename.replace(/\.pdf$/, ".csv") });
          const response = respond(fallbackContent, "csv", filename.replace(/\.pdf$/, ".csv"));
          response.headers.set("X-Fallback-Reason", `${format} generation failed, CSV provided instead`);
          return response;
        }
      }
      const content = generateCertificateCsv(rows);
      reportCache.set(cacheKey, { content, format, filename });
      return respond(content, format, filename);
    }

    if (!type) {
      return NextResponse.json({ error: "Report type is required" }, { status: 400 });
    }

    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  } catch (err) {
    console.error("Reports API error:", err);
    return errorResponse(err);
  }
}
