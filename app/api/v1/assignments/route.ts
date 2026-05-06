import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { listAssignments } from "@/server/modules/assignments/service";

export async function GET() {
  try {
    await requireUser("courses:read");
    return ok(await listAssignments());
  } catch (error) {
    return errorResponse(error);
  }
}

