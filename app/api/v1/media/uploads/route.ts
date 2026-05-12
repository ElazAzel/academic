import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { createPresignedUploadUrl, buildStorageKey } from "@/lib/storage";
import { z } from "zod";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/webm",
  "application/zip",
] as const;

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

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
    const { url, publicUrl } = await createPresignedUploadUrl(storageKey, input.contentType);

    return ok({ url, publicUrl, key: storageKey });
  } catch (error) {
    return errorResponse(error);
  }
}
