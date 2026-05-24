import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { importScormPackage } from "@/server/modules/scorm/import";

type Context = { params: Promise<{ lessonId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    await requireUser("courses:write");
    const { lessonId } = await context.params;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return ok({ error: "Файл не предоставлен" }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importScormPackage(lessonId, buffer);

    return ok(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
