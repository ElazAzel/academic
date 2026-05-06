import { getPrisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/http";

export async function GET() {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return ok({ status: "ready" });
  } catch (error) {
    return errorResponse(error);
  }
}

