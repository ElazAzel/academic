import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { listAuditLogs } from "@/server/modules/audit/service";

export async function GET() {
  try {
    await requireUser("audit:read");
    return ok(await listAuditLogs());
  } catch (error) {
    return errorResponse(error);
  }
}

