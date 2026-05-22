import { requireUser } from "@/lib/auth/session";
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

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

/**
 * POST /api/v1/chat/upload
 *
 * Загружает файл в Supabase Storage.
 * Принимает multipart/form-data с полем "file".
 * Возвращает { publicUrl: string }.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json({ error: "Файл не передан" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: "Файл слишком большой. Максимум 15MB" }, { status: 413 });
    }

    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      return Response.json(
        { error: "Формат не поддерживается. Разрешены: PNG, JPEG, GIF, WebP, PDF, DOC, DOCX, TXT" },
        { status: 415 },
      );
    }

    const key = buildStorageKey(`chat/${user.id}`, file.name);
    const publicUrl = await uploadFileToSupabase(key, file);

    if (!publicUrl) {
      return Response.json({ error: "Хранилище недоступно" }, { status: 503 });
    }

    return Response.json({ publicUrl, attachmentType: file.type });
  } catch (error) {
    console.error("Chat upload error:", error);
    return Response.json({ error: "Ошибка загрузки файла" }, { status: 500 });
  }
}
