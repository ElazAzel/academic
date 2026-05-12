import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/http";
import { fetchProgressData, fetchRiskData, fetchCertificateData } from "@/lib/reports/data";
import { generateProgressCsv, generateRiskCsv, generateCertificateCsv } from "@/lib/reports/csv-generator";
import { generateProgressXlsx, generateRiskXlsx, generateCertificateXlsx } from "@/lib/reports/xlsx-generator";
import { generateProgressPdf, generateRiskPdf } from "@/lib/reports/pdf-generator";
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

function respond(content: string | Buffer, format: ReportFormat, filename: string) {
  const body = typeof content === "string" ? content : new Uint8Array(content);
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

    if (!isAdmin && !isSuperCurator && !isCurator && !isObserver) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const format = (searchParams.get("format") || "csv") as ReportFormat;

    if (!["csv", "xlsx", "pdf"].includes(format)) {
      return NextResponse.json({ error: "Unsupported format. Use csv, xlsx, or pdf." }, { status: 400 });
    }

    const getScopedStudentIds = async () => {
      if (!isSuperCurator || isAdmin) return undefined;
      const assignments = await prisma.curatorAssignment.findMany({
        where: { superCuratorId: user.id, active: true },
        select: { studentId: true },
      });
      return assignments.map((a) => a.studentId);
    };

    const scopedIds = await getScopedStudentIds();

    if (type === "progress" || (type === "curator_progress" && isCurator)) {
      const studentIds = type === "curator_progress"
        ? (await prisma.curatorAssignment.findMany({ where: { curatorId: user.id }, select: { studentId: true } })).map((a) => a.studentId)
        : scopedIds;
      const rows = await fetchProgressData(studentIds);
      const filename = `${type}_report${EXT[format]}`;

      if (format === "xlsx") return respond(await generateProgressXlsx(rows), format, filename);
      if (format === "pdf") return respond(await generateProgressPdf(rows), format, filename);
      return respond(generateProgressCsv(rows), format, filename);
    }

    if (type === "risk" || (type === "curator_risk" && isCurator)) {
      const studentIds = type === "curator_risk"
        ? (await prisma.curatorAssignment.findMany({ where: { curatorId: user.id }, select: { studentId: true } })).map((a) => a.studentId)
        : scopedIds;
      const rows = await fetchRiskData(studentIds);
      const filename = `${type}_report${EXT[format]}`;

      if (format === "xlsx") return respond(await generateRiskXlsx(rows), format, filename);
      if (format === "pdf") return respond(await generateRiskPdf(rows), format, filename);
      return respond(generateRiskCsv(rows), format, filename);
    }

    if (type === "certificates") {
      const rows = await fetchCertificateData();
      const filename = `certificates_report${EXT[format]}`;

      if (format === "xlsx") return respond(await generateCertificateXlsx(rows), format, filename);
      return respond(generateCertificateCsv(rows), format, filename);
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
