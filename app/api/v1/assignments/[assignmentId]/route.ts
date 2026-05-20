import { errorResponse, ok, parseJson, ApiError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
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
    await requireUser("courses:read");
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
      }
    });
    if (!assignment) throw new ApiError("not_found", "Задание не найдено", 404);
    return ok(assignment);
  } catch (error) {
    return errorResponse(error);
  }
}

async function assertCourseInstructor(userId: string, courseId: string | null | undefined) {
  if (!courseId) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: { select: { key: true } } } } }
  });
  if (!user) throw new ApiError("forbidden", "Пользователь не найден", 403);
  const roleKeys = user.roles.map((r) => r.role.key);
  if (roleKeys.includes("admin")) return;
  const instructor = await prisma.courseInstructor.findUnique({
    where: { courseId_userId: { courseId, userId } }
  });
  if (!instructor) throw new ApiError("forbidden", "Вы не являетесь преподавателем этого курса", 403);
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
    await assertCourseInstructor(user.id, courseId);

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
    await assertCourseInstructor(user.id, courseId);

    await prisma.assignment.delete({ where: { id: assignmentId } });
    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
