import { requireUser } from "@/lib/auth/session";
import { ApiError, errorResponse } from "@/lib/http";
import {
  fallbackUploadParamsSchema,
  getUploadMaxFileSizeBytes,
  getUploadPermissionForPrefix,
  parseMediaUploadPrefixFromKey,
} from "@/lib/media-upload-policy";
import { uploadFileToSupabase } from "@/lib/storage";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const input = fallbackUploadParamsSchema.parse({
      key: searchParams.get("key") ?? "",
      contentType: searchParams.get("contentType") ?? "",
    });

    const prefix = parseMediaUploadPrefixFromKey(input.key);
    if (!prefix) {
      throw new ApiError("bad_request", "Unsupported storage key", 400);
    }

    await requireUser(getUploadPermissionForPrefix(prefix));

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > getUploadMaxFileSizeBytes()) {
      throw new ApiError("bad_request", "File is too large", 413);
    }

    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      throw new ApiError("bad_request", "File is empty", 400);
    }

    if (buffer.length > getUploadMaxFileSizeBytes()) {
      throw new ApiError("bad_request", "File is too large", 413);
    }

    const publicUrl = await uploadFileToSupabase(input.key, buffer, input.contentType);

    if (!publicUrl) {
      throw new ApiError("service_unavailable", "Storage upload failed", 503);
    }

    return NextResponse.json({ success: true, publicUrl });
  } catch (error) {
    if (!(error instanceof ApiError) && !(error instanceof ZodError)) {
      console.error("[Upload Fallback Error]:", error);
    }
    return errorResponse(error);
  }
}
