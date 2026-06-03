import { getPrisma } from "@/lib/prisma";
import { ApiError, errorResponse, ok } from "@/lib/http";

export async function GET() {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return ok({ status: "ready" });
  } catch {
    return errorResponse(new ApiError("service_unavailable", "База данных недоступна", 503));
  }
}
