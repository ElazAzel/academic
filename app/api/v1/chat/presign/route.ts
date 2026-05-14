import { ok, errorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getUploadUrl } from "@/server/actions/chat";

export async function GET() {
  try {
    await requireUser("notifications:write");
    const result = await getUploadUrl();
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
