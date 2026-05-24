import { ApiError, errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { createPresignedUploadUrl, buildStorageKey } from "@/lib/storage";
import { env } from "@/lib/env";
import { getUploadPermissionForPrefix, mediaUploadSchema } from "@/lib/media-upload-policy";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, mediaUploadSchema);
    const prefix = input.prefix ?? "uploads";
    const filename = input.filename;
    const contentType = input.contentType;
    if (!filename || !contentType) {
      throw new ApiError("bad_request", "Upload filename and content type are required", 400);
    }

    await requireUser(getUploadPermissionForPrefix(prefix));

    const storageKey = buildStorageKey(prefix, filename);
    const supabaseUrl = env.STORAGE_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL || "https://jqltcnuxpmeckezoypfm.supabase.co";
    const fallbackPublicUrl = `${supabaseUrl}/storage/v1/object/public/academy-media/${storageKey}`;
    const fallbackUploadUrl = `/api/v1/media/upload-fallback?key=${encodeURIComponent(storageKey)}&contentType=${encodeURIComponent(contentType)}`;
    const result = await createPresignedUploadUrl(storageKey, contentType);

    if (!result) {
      console.log(`[Storage Fallback] S3 offline. Using cloud proxy fallback. Key: ${storageKey}`);
      return ok({ url: fallbackUploadUrl, publicUrl: fallbackPublicUrl, fallbackUrl: fallbackUploadUrl, key: storageKey });
    }

    return ok({ url: result.url, publicUrl: result.publicUrl, fallbackUrl: fallbackUploadUrl, key: storageKey });
  } catch (error) {
    return errorResponse(error);
  }
}
