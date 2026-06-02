import { errorResponse, ok, empty } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { deleteScormDirectory } from "@/server/modules/scorm/storage";
import { getScormLessonCourseId } from "@/server/modules/scorm/service";
import { assertInstructorOfCourse } from "@/server/modules/courses/service";

type Context = { params: Promise<{ lessonId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { lessonId } = await context.params;
    const courseId = await getScormLessonCourseId(lessonId);
    await assertInstructorOfCourse(user.id, courseId);

    const prisma = getPrisma();

    const pkg = await prisma.scormPackage.findUnique({ where: { lessonId } });
    if (!pkg) return ok(null, 200);

    return ok({
      id: pkg.id,
      title: pkg.title,
      scormVersion: pkg.scormVersion,
      organizations: (pkg.manifest as { organizations?: Array<{ identifier: string; title: string }> })?.organizations ?? [],
      fileCount: 0,
      entryUrl: pkg.entryUrl,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { lessonId } = await context.params;
    const courseId = await getScormLessonCourseId(lessonId);
    await assertInstructorOfCourse(user.id, courseId);

    const prisma = getPrisma();

    const pkg = await prisma.scormPackage.findUnique({ where: { lessonId } });
    if (!pkg) return empty(204);

    await deleteScormDirectory(pkg.id);
    await prisma.scormPackage.delete({ where: { id: pkg.id } });

    return empty(204);
  } catch (error) {
    return errorResponse(error);
  }
}
