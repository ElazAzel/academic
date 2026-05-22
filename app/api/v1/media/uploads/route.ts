import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { createPresignedUploadUrl, buildStorageKey } from "@/lib/storage";
import { UPLOAD } from "@/lib/constants";
import { env } from "@/lib/env";
import { z } from "zod";

const ALLOWED_CONTENT_TYPES = UPLOAD.ALLOWED_MIME_TYPES;

const MAX_FILE_SIZE = UPLOAD.MAX_FILE_SIZE_BYTES;

const schema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).refine(
    (val) => ALLOWED_CONTENT_TYPES.includes(val as typeof ALLOWED_CONTENT_TYPES[number]),
    { message: `Недопустимый тип файла. Разрешены: ${ALLOWED_CONTENT_TYPES.join(", ")}` }
  ),
  fileSize: z.number().int().min(1).max(MAX_FILE_SIZE).optional(),
  prefix: z.string().default("uploads"),
});

export async function POST(request: Request) {
  try {
    await requireUser("courses:write");
    const input = await parseJson(request, schema);
    const storageKey = buildStorageKey(input.prefix ?? "uploads", input.filename);
    const result = await createPresignedUploadUrl(storageKey, input.contentType);

    if (!result) {
      // S3 (MinIO) is not available locally or in prod.
      // Generate fallback URL pointing to our local API proxy which will upload to Supabase.
      const supabaseUrl = env.STORAGE_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL || "https://jqltcnuxpmeckezoypfm.supabase.co";
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/academy-media/${storageKey}`;
      const fallbackUploadUrl = `/api/v1/media/upload-fallback?key=${encodeURIComponent(storageKey)}&contentType=${encodeURIComponent(input.contentType)}`;
      
      console.log(`[Storage Fallback] S3 offline. Using cloud proxy fallback. Key: ${storageKey}`);
      return ok({ url: fallbackUploadUrl, publicUrl, key: storageKey });
    }

    return ok({ url: result.url, publicUrl: result.publicUrl, key: storageKey });
  } catch (error) {
    return errorResponse(error);
  }
}
