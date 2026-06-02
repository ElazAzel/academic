import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { errorResponse, parseJson } from "@/lib/http";
import { createAssignmentInline } from "@/server/modules/course-builder/service";

const inlineAssignmentSchema = z.object({
  lessonId: z.string().trim().min(1, "ID урока обязателен"),
  courseId: z.string().trim().min(1, "ID курса обязателен"),
  title: z.string().trim().min(1, "Название задания обязательно"),
  instructions: z.string().trim().min(1, "Описание задания обязательно"),
  maxAttempts: z.coerce.number().int().min(1),
  maxScore: z.coerce.number().int().min(0, "Максимальный балл не может быть отрицательным"),
  deadline: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser("courses:write");
    const body = await parseJson(request, inlineAssignmentSchema);
    const assignment = await createAssignmentInline(
      body.lessonId,
      body,
      user.id,
    );
    return NextResponse.json(assignment, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
