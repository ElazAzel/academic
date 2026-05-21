import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { assertInstructorOfCourse } from "@/server/modules/course-builder/service";
import { listCourseQuestions } from "@/server/modules/courses/service";

type Context = { params: Promise<{ courseId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:read");
    const { courseId } = await context.params;
    await assertInstructorOfCourse(user.id, courseId);
    return ok(await listCourseQuestions(courseId));
  } catch (error) {
    return errorResponse(error);
  }
}
