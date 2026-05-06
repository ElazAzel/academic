import { CourseStatus } from "@prisma/client";
import { created, errorResponse, getSearchParam, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { courseSchema } from "@/lib/validation";
import { createCourse, listCourses } from "@/server/modules/courses/service";

export async function GET(request: Request) {
  try {
    await requireUser("courses:read");
    const rawStatus = getSearchParam(request, "status");
    const status = rawStatus && rawStatus in CourseStatus ? CourseStatus[rawStatus as keyof typeof CourseStatus] : undefined;
    return ok(await listCourses(status));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser("courses:write");
    const input = await parseJson(request, courseSchema);
    return created(await createCourse(
      {
        ...input,
        durationHours: input.durationHours ?? 0,
        traversalMode: input.traversalMode ?? "sequential"
      },
      user.id
    ));
  } catch (error) {
    return errorResponse(error);
  }
}
