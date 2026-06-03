import { ApiError, errorResponse } from "@/lib/http";
import { BILLING_DISABLED_MESSAGE } from "@/server/modules/billing/service";

/** Платежи отключены. Платформа использует доступ по инвайтам. */
export async function POST() {
  return errorResponse(new ApiError("gone", BILLING_DISABLED_MESSAGE, 410));
}
