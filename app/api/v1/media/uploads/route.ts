import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { createPresignedUploadUrl, buildStorageKey } from "@/lib/storage";
import { z } from "zod";

const schema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
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
