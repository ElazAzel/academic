import { requireUser } from "@/lib/auth/session";
import { errorResponse, ok } from "@/lib/http";
import { listPopupTargetingCohorts } from "@/server/modules/cohorts/service";

export async function GET() {
  try {
    await requireUser("settings:manage");
    const cohorts = await listPopupTargetingCohorts();

    return ok(
      cohorts.map((cohort) => ({
        id: cohort.id,
        name: cohort.name,
        courseTitle: cohort.course?.title ?? "",
        status: cohort.status,
      })),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
