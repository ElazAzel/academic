import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { listUsers } from "@/server/modules/users/service";

export async function GET() {
  try {
    await requireUser("users:read");
    return ok(await listUsers({ take: 200 }));
  } catch (error) {
    return errorResponse(error);
  }
}
