import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http";
import { createAssignmentInline } from "@/server/modules/course-builder/service";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const assignment = await createAssignmentInline(body.lessonId, body, user.id);
    return NextResponse.json(assignment, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
