import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { is2faEnabled } from "@/server/modules/2fa/service";

/**
 * GET /api/v1/auth/2fa/status
 * Returns whether 2FA is enabled for the current user.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const enabled = await is2faEnabled(user.id);
    return NextResponse.json({ enabled });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
