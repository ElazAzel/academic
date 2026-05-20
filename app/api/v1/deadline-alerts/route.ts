import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getCuratorDeadlineAlerts } from "@/server/modules/deadlines/service";

// GET /api/v1/deadline-alerts — get deadline alerts for the current curator
export async function GET() {
  try {
    const user = await requireUser();

    // Only curators, super_curators, and admins see alerts
    const isCurator = user.roles.some((r) => ["curator", "super_curator", "admin"].includes(r));
    if (!isCurator) {
      return ok([]);
    }

    const alerts = await getCuratorDeadlineAlerts(user.id);
    return ok(alerts);
  } catch (error) {
    return errorResponse(error);
  }
}
