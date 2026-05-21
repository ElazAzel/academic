import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { generateReportDownload, getAvailableReportsForRoles, parseReportFormat } from "@/server/modules/reports/service";
import type { ReportFormat } from "@/lib/reports/types";

const MIME: Record<ReportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

function toUint8(content: string | Buffer | Uint8Array | ArrayBuffer): Uint8Array {
  if (typeof content === "string") return new TextEncoder().encode(content);
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  return content;
}

function respond(content: string | Buffer | Uint8Array | ArrayBuffer, format: ReportFormat, filename: string) {
  const isBinary = format === "pdf" || format === "xlsx";

  if (isBinary) {
    const bodyBytes = toUint8(content);
    const body = new Uint8Array(bodyBytes.byteLength);
    body.set(bodyBytes);
    return new Response(body.buffer, {
      status: 200,
      headers: {
        "Content-Type": MIME[format],
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(bodyBytes.byteLength),
      },
    });
  }

  const str = typeof content === "string" ? content : new TextDecoder().decode(toUint8(content));
  return new NextResponse(str, {
    headers: {
      "Content-Type": MIME[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const format = parseReportFormat(searchParams.get("format"));

    const rl = await checkRateLimit(`reports:download:${user.id}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Слишком много запросов. Попробуйте позже." }, { status: 429 });
    }

    if (searchParams.get("meta") === "1") {
      return NextResponse.json({
        data: getAvailableReportsForRoles(user.roles).map((report) => ({
          type: report.type,
          title: report.title,
          owner: report.owner,
          decision: report.decision,
          allowedRoles: report.allowedRoles,
        })),
      });
    }

    const clientFields = searchParams.get("fields")?.split(",").filter(Boolean);

    const download = await generateReportDownload({
      user,
      type: searchParams.get("type"),
      format,
      fields: clientFields,
    });

    const response = respond(download.content, download.format, download.filename);
    response.headers.set("X-Report-Type", download.definition.type);
    response.headers.set("X-Report-Owner", encodeURIComponent(download.definition.owner));
    response.headers.set("X-Report-Scope", encodeURIComponent(download.access.scopeLabel));
    if (download.fallbackReason) {
      response.headers.set("X-Fallback-Reason", download.fallbackReason);
    }
    return response;
  } catch (err) {
    console.error("Reports API error:", err);
    return errorResponse(err);
  }
}
