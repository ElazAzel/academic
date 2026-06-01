import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http";
import { createQuizInline } from "@/server/modules/course-builder/service";

export async function POST(request: Request) {
  try {
    const user = await requireUser("courses:write");
    const body = await request.json();
    const quiz = await createQuizInline(body.lessonId, body, user.id);
    return NextResponse.json(quiz, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
