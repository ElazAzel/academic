import { errorResponse, ok, parseJson, ApiError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { assertInstructorOfCourse } from "@/server/modules/courses/service";
import { assertCourseReadAccess } from "@/server/modules/courses/access";
import { z } from "zod";

type Context = { params: Promise<{ assignmentId: string }> };

const prisma = getPrisma();

const updateAssignmentSchema = z.object({
  title: z.string().min(3).optional(),
  instructions: z.string().optional(),
  maxScore: z.number().int().min(1).optional(),
  maxAttempts: z.number().int().min(1).optional(),
});

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:read");
    const { assignmentId } = await context.params;
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        title: true,
        instructions: true,
        maxScore: true,
        maxAttempts: true,
        courseId: true,
        lessonId: true,
        createdAt: true,
        updatedAt: true,
        lesson: {
          select: {
            module: { select: { courseId: true } },
          },
        },
      }
    });
    if (!assignment) throw new ApiError("not_found", "Задание не найдено", 404);
    const courseId = assignment.courseId ?? assignment.lesson?.module.courseId;
    if (!courseId) throw new ApiError("bad_request", "Задание не привязано к курсу", 400);
    await assertCourseReadAccess(user, courseId);
    return ok({
      id: assignment.id,
      title: assignment.title,
      instructions: assignment.instructions,
      maxScore: assignment.maxScore,
      maxAttempts: assignment.maxAttempts,
      courseId: assignment.courseId,
      lessonId: assignment.lessonId,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { assignmentId } = await context.params;
    const input = await parseJson(request, updateAssignmentSchema);

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { courseId: true, lesson: { select: { module: { select: { courseId: true } } } } }
    });
    if (!assignment) throw new ApiError("not_found", "Задание не найдено", 404);
    const courseId = assignment.courseId ?? assignment.lesson?.module.courseId;
    if (!courseId) throw new ApiError("bad_request", "Задание не привязано к курсу", 400);
    await assertInstructorOfCourse(user.id, courseId);

    const updated = await prisma.assignment.update({
      where: { id: assignmentId },
      data: input,
      select: {
        id: true,
        title: true,
        instructions: true,
        maxScore: true,
        maxAttempts: true,
        courseId: true,
        lessonId: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    
    return ok(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { assignmentId } = await context.params;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { courseId: true, lesson: { select: { module: { select: { courseId: true } } } } }
    });
    if (!assignment) throw new ApiError("not_found", "Задание не найдено", 404);
    const courseId = assignment.courseId ?? assignment.lesson?.module.courseId;
    if (!courseId) throw new ApiError("bad_request", "Задание не привязано к курсу", 400);
    await assertInstructorOfCourse(user.id, courseId);

    await prisma.assignment.delete({ where: { id: assignmentId } });
    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
