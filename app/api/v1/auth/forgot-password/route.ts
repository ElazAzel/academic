import { z } from "zod";
import { ApiError, errorResponse, ok, parseJson } from "@/lib/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { requestPasswordReset } from "@/server/modules/auth/service";

const schema = z.object({ email: z.string().email() });

/**
 * Обрабатывает заявку на восстановление пароля.
 *
 * Создаёт токен сброса и отправляет email со ссылкой для восстановления.
 * Всегда возвращает успех, чтобы не раскрывать наличие email в системе.
 */
export async function POST(request: Request) {
  try {
    const input = await parseJson(request, schema);
    const rl = await checkRateLimit(`forgot-password:${input.email}`);
    if (!rl.allowed) {
      return errorResponse(new ApiError("too_many_requests", "Слишком много запросов. Попробуйте позже.", 429));
    }

    // requestPasswordReset сам проверяет наличие пользователя,
    // создаёт токен, отправляет email и логирует аудит
    await requestPasswordReset(input.email);

    // Всегда возвращаем успех — не раскрываем наличие email в системе
    return ok({ accepted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
