import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { updateBlock, deleteBlock } from "@/server/modules/courses/service";
import { z } from "zod";

type Context = { params: Promise<{ blockId: string }> };

const updateBlockSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullish(),
  order: z.number().int().min(0).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { blockId } = await context.params;
    const input = await parseJson(request, updateBlockSchema);
    return ok(await updateBlock(blockId, { ...input, description: input.description ?? undefined }, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { blockId } = await context.params;
    return ok(await deleteBlock(blockId, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
