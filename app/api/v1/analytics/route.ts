import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getAdminOverview } from "@/server/modules/analytics/service";

export async function GET() {
  try {
    await requireUser("analytics:read");
    return ok(await getAdminOverview());
  } catch (error) {
    return errorResponse(error);
  }
}

