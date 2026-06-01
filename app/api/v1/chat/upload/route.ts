import { requireUser } from "@/lib/auth/session";
import { ApiError, errorResponse } from "@/lib/http";
import { buildStorageKey, uploadFileToSupabase } from "@/lib/storage";

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const MAX_FILE_SIZE = 15 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new ApiError("bad_request", "Файл не передан", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ApiError(
        "bad_request",
        "Файл слишком большой. Максимум 15MB",
        413,
      );
    }

    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      throw new ApiError(
        "bad_request",
        "Формат не поддерживается. Разрешены: PNG, JPEG, GIF, WebP, PDF, DOC, DOCX, TXT",
        415,
      );
    }

    const key = buildStorageKey(`chat/${user.id}`, file.name);
    const publicUrl = await uploadFileToSupabase(key, file);

    if (!publicUrl) {
      throw new ApiError("service_unavailable", "Хранилище недоступно", 503);
    }

    return Response.json({ publicUrl, attachmentType: file.type });
  } catch (error) {
    return errorResponse(error);
  }
}
