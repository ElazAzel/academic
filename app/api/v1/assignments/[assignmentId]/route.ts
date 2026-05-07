import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
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
      where: { id: assignmentId }
    });
    if (!assignment) throw new ApiError("not_found", "Задание не найдено", 404);
    return ok(assignment);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { assignmentId } = await context.params;
    const input = await parseJson(request, updateAssignmentSchema);
    
    const assignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: input
    });
    
    return ok(assignment);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requireUser("courses:write");
    const { assignmentId } = await context.params;
    await prisma.assignment.delete({ where: { id: assignmentId } });
    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
