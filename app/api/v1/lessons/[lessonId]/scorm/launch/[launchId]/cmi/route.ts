import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getCmiValue, setCmiValues } from "@/server/modules/scorm/cmi-service";

type Context = { params: Promise<{ lessonId: string; launchId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { launchId } = await context.params;
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    if (!name) return ok({ error: "name parameter required" }, 400);

    const value = await getCmiValue(launchId, user.id, name);
    return ok(value);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { launchId } = await context.params;
    const body = await request.json();
    const { values } = body as { values: Record<string, string> };
    if (!values) return ok({ error: "values object required" }, 400);

    await setCmiValues(launchId, user.id, values);
    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
