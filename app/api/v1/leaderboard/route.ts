import { getLeaderboardForActor } from "@/server/actions/xp";
import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await requireUser("courses:read");
    return ok(await getLeaderboardForActor(user, 20));
  } catch (error) {
    return errorResponse(error);
  }
}
