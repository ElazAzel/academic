import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { createDiscussionPost, deleteDiscussionPost } from "@/server/modules/discussion/service";
import { createDiscussionPostSchema } from "@/lib/validation";
import { z } from "zod";

type Context = { params: Promise<{ lessonId: string }> };

const deleteDiscussionPostSchema = z.object({
  postId: z.string().min(1, "postId обязателен"),
});

/**
 * POST /api/v1/lessons/:lessonId/discussion/posts
 *
 * Создаёт новый пост в обсуждении урока.
 */
export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:read");
    const { lessonId } = await context.params;
    const input = await parseJson(request, createDiscussionPostSchema);
    return ok(
      await createDiscussionPost(user.id, lessonId, input.text, input.parentId),
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * DELETE /api/v1/lessons/:lessonId/discussion/posts
 *
 * Удаляет пост (только автор или админ/инструктор).
 * Body: { postId: string }
 */
export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:read");
    const { lessonId } = await context.params;
    const input = await parseJson(request, deleteDiscussionPostSchema);
    await deleteDiscussionPost(user.id, lessonId, input.postId);
    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
