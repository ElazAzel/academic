import { z } from "zod";
import { ApiError, errorResponse, ok, parseJson } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/security/rate-limit";

const prisma = getPrisma();

const schema = z.object({ email: z.string().email() });

/**
 * Обрабатывает заявку на восстановление пароля.
 *
 * Вместо отправки email с токеном (самостоятельное восстановление отключено),
 * создаёт уведомление администратору о заявке пользователя.
 * Администратор свяжется с пользователем по email вручную.
 */
export async function POST(request: Request) {
  try {
    const input = await parseJson(request, schema);
    const rl = await checkRateLimit(`forgot-password:${input.email}`);
    if (!rl.allowed) {
      return errorResponse(new ApiError("too_many_requests", "Слишком много запросов. Попробуйте позже.", 429));
    }

    // Проверяем, есть ли пользователь с таким email
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
      select: { id: true, email: true, name: true },
    });

    if (user) {
      // Создаём уведомление для администраторов
      const admins = await prisma.user.findMany({
        where: { roles: { some: { role: { name: "admin" } } } },
        select: { id: true },
      });

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: "password_change_request",
            channel: "in_app",
            title: "Заявка на восстановление пароля",
            body: `Пользователь ${user.name || user.email} (${user.email}) запросил восстановление пароля.`,
            status: "SENT",
            data: { userEmail: user.email, userName: user.name },
          },
        }).catch(() => { /* silent */ });
      }
    }

    // Всегда возвращаем успех — не раскрываем наличие email в системе
    return ok({ accepted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
