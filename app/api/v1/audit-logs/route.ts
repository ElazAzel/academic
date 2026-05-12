import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { listAuditLogs } from "@/server/modules/audit/service";

export async function GET(request: Request) {
  try {
    await requireUser("audit:read");
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10)));
    return ok(await listAuditLogs(page, limit));
  } catch (error) {
    return errorResponse(error);
  }
}

