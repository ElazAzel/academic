import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import {
  getCohortBlockDeadlines,
  setBlockDeadlines,
} from "@/server/modules/deadlines/service";

const upsertSchema = z.object({
  deadlines: z.array(
    z.object({
      blockId: z.string().min(1),
      dueAt: z.string().datetime(),
    }),
  ).min(1),
});

// GET /api/v1/cohorts/[cohortId]/block-deadlines
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cohortId: string }> },
) {
  try {
    await requireUser();
    const { cohortId } = await params;
    const data = await getCohortBlockDeadlines(cohortId);
    return ok(data);
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/v1/cohorts/[cohortId]/block-deadlines
export async function POST(
  request: Request,
  { params }: { params: Promise<{ cohortId: string }> },
) {
  try {
    const user = await requireUser();
    const { cohortId } = await params;
    const body = await parseJson(request, upsertSchema);
    const deadlines = body.deadlines.map((d) => ({
      blockId: d.blockId,
      dueAt: new Date(d.dueAt),
    }));
    const result = await setBlockDeadlines(cohortId, deadlines, user.id);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
