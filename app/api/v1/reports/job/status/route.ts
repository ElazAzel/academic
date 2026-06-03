import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { errorResponse, ApiError } from "@/lib/http";

const prisma = getPrisma();

const ALLOWED_REPORT_TYPES = new Set(["progress", "risk", "assignments", "certificates", "curator_workload"]);
const ALLOWED_REPORT_FORMATS = new Set(["csv", "xlsx", "pdf"]);
const REPORT_FIELD_TOKEN = /^[A-Za-z][A-Za-z0-9_]*$/;
const MAX_REPORT_FIELDS = 30;

function getSafeReportDownloadUrl(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/api/v1/reports?")) {
    return undefined;
  }

  try {
    const url = new URL(value, "http://localhost");
    if (url.pathname !== "/api/v1/reports") return undefined;

    const typeValues = url.searchParams.getAll("type");
    const formatValues = url.searchParams.getAll("format");
    const fieldValues = url.searchParams.getAll("fields");
    const knownParamCount = typeValues.length + formatValues.length + fieldValues.length;
    if (url.searchParams.size !== knownParamCount) return undefined;
    if (typeValues.length !== 1 || formatValues.length !== 1 || fieldValues.length > 1) return undefined;

    const type = url.searchParams.get("type");
    const format = url.searchParams.get("format");
    if (!type || !format) return undefined;
    if (!ALLOWED_REPORT_TYPES.has(type) || !ALLOWED_REPORT_FORMATS.has(format)) return undefined;

    const fieldsValue = fieldValues[0];
    let fieldsQuery = "";
    if (fieldsValue !== undefined) {
      const fields = fieldsValue.split(",");
      if (fields.length === 0 || fields.length > MAX_REPORT_FIELDS) return undefined;
      if (fields.some((field) => !REPORT_FIELD_TOKEN.test(field))) return undefined;
      fieldsQuery = `&fields=${encodeURIComponent(fields.join(","))}`;
    }

    return `${url.pathname}?type=${encodeURIComponent(type)}&format=${encodeURIComponent(format)}${fieldsQuery}`;
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser("reports:read");
    const jobId = request.nextUrl.searchParams.get("jobId");

    if (!jobId) {
      throw new ApiError("bad_request", "jobId обязателен", 400);
    }

    const event = await prisma.outboxEvent.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, error: true, payload: true },
    });

    if (!event) {
      throw new ApiError("not_found", "Задача не найдена", 404);
    }

    const payload =
      event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
        ? (event.payload as Record<string, unknown>)
        : {};
    const eventUserId = typeof payload.userId === "string" ? payload.userId : undefined;
    const isAdmin = user.roles.includes("admin");

    // Ownership check: only the owner or an admin may poll a job.
    // Legacy/malformed report jobs without userId are admin-only to avoid guessed-ID leaks.
    if (!isAdmin && eventUserId !== user.id) {
      throw new ApiError("forbidden", "Доступ к задаче запрещен", 403);
    }

    const statusMap: Record<string, string> = {
      pending: "pending",
      processing: "processing",
      sent: "completed",
      failed: "failed",
    };

    const downloadUrl = event.status === "sent" ? getSafeReportDownloadUrl(payload.downloadUrl) : undefined;

    return NextResponse.json({
      status: statusMap[event.status] ?? event.status,
      downloadUrl,
      error: event.error ?? undefined,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
