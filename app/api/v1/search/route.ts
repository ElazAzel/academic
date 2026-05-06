import { errorResponse, getSearchParam, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { searchAcademy } from "@/server/modules/search/service";

export async function GET(request: Request) {
  try {
    await requireUser("courses:read");
    return ok(await searchAcademy(getSearchParam(request, "q")));
  } catch (error) {
    return errorResponse(error);
  }
}

