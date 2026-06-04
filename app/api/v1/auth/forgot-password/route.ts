import { errorResponse, ApiError } from "@/lib/http";
import { getRuntimeBranding } from "@/server/modules/branding/service";

/**
 * Самостоятельный сброс пароля отключён.
 * Для восстановления доступа необходимо написать на support email из white-label config.
 */
export async function POST() {
  const branding = await getRuntimeBranding();

  return errorResponse(
    new ApiError("gone", `Самостоятельный сброс пароля отключён. Напишите на ${branding.supportEmail} для восстановления доступа.`, 410)
  );
}
