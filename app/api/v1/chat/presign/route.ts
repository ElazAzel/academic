import { ok, errorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getUploadUrlForFile } from "@/server/actions/chat";

export async function GET(request: Request) {
  try {
    await requireUser();
    const params = new URL(request.url).searchParams;
    const filename = params.get("filename") ?? "image.png";
    const contentType = params.get("contentType") ?? "image/png";
    const result = await getUploadUrlForFile(filename, contentType);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
