import { errorResponse } from "@/lib/http";

/** Payments are disabled. The platform uses invite-based access. */
export async function POST() {
  return errorResponse(new Error("Payments are disabled. Use invite links for access."));
}
