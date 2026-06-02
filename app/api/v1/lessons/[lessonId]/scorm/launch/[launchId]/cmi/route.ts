import { ApiError, errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getCmiValue, setCmiValues } from "@/server/modules/scorm/cmi-service";
import { z } from "zod";

type Context = { params: Promise<{ lessonId: string; launchId: string }> };

const setCmiValuesSchema = z.object({
  values: z.record(z.string(), z.string()),
});

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { launchId } = await context.params;
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    if (!name) throw new ApiError("bad_request", "Параметр name обязателен", 400);

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
    const { values } = await parseJson(request, setCmiValuesSchema);

    await setCmiValues(launchId, user.id, values);
    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
