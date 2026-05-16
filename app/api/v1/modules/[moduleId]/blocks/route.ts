import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { errorResponse, parseJson } from "@/lib/http";
import { createBlock } from "@/server/modules/courses/service";
import { z } from "zod";

type Context = { params: Promise<{ moduleId: string }> };

const schema = z.object({
  title: z.string().min(1),
  order: z.number().int().min(0),
});

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { moduleId } = await context.params;
    const input = await parseJson(request, schema);
    const block = await createBlock(moduleId, input, user.id);
    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
