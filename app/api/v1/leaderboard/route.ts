import { getLeaderboard } from "@/server/actions/xp";
import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireUser("courses:read");
    return ok(await getLeaderboard(20));
  } catch (error) {
    return errorResponse(error);
  }
}
