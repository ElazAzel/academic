import { ApiError, errorResponse } from "@/lib/http";

export async function POST() {
  return errorResponse(
    new ApiError(
      "gone",
      "Самостоятельная регистрация отключена. Аккаунты создаёт академия и выдаёт логин/пароль слушателю.",
      410
    )
  );
}
