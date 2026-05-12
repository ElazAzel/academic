import { created, errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { enrollmentSchema } from "@/lib/validation";
import { enrollStudent, listEnrollments } from "@/server/modules/courses/service";

export async function GET() {
  try {
    const user = await requireUser("reports:read");
    return ok(await listEnrollments(user.id, user.roles));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser("enrollments:write");
    const input = await parseJson(request, enrollmentSchema);
    return created(await enrollStudent(input, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

