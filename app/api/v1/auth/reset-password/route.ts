import { errorResponse, ApiError } from "@/lib/http";

/**
 * Самостоятельный сброс пароля отключён.
 * Для восстановления доступа необходимо написать на admin@aistrategic.kz.
 */
export async function POST() {
  return errorResponse(
    new ApiError("gone", "Самостоятельный сброс пароля отключён. Напишите на admin@aistrategic.kz для восстановления доступа.", 410)
  );
}
