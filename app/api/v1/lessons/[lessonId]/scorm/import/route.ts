import { ApiError, errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { importScormPackage } from "@/server/modules/scorm/import";
import { getScormLessonCourseId } from "@/server/modules/scorm/service";
import { assertInstructorOfCourse } from "@/server/modules/courses/service";

type Context = { params: Promise<{ lessonId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { lessonId } = await context.params;
    const courseId = await getScormLessonCourseId(lessonId);
    await assertInstructorOfCourse(user.id, courseId);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new ApiError("bad_request", "Файл не предоставлен", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importScormPackage(lessonId, buffer);

    return ok(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
