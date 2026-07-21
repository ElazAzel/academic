import { requireUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Compatibility endpoint for clients from deployments that still open the
 * retired notification EventSource. HTTP 204 tells EventSource clients not to
 * reconnect, avoiding long-lived serverless functions and repeated timeouts.
 * Current clients poll /api/v1/notifications instead.
 */
export async function GET() {
  await requireUser();

  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
