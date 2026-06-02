import { errorResponse, getSearchParam, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { searchAcademy } from "@/server/modules/search/service";

export async function GET(request: Request) {
  try {
    const user = await requireUser("courses:read");
    const includeUsers = user.roles.includes("admin");
    return ok(await searchAcademy(getSearchParam(request, "q"), user, includeUsers));
  } catch (error) {
    return errorResponse(error);
  }
}
