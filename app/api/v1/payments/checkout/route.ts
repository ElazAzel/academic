import { ApiError, errorResponse } from "@/lib/http";

/** Payments are disabled. The platform uses invite-based access. */
export async function POST() {
  return errorResponse(
    new ApiError(
      "gone",
      "Payments are disabled for the invite-only academy profile. Use invite links for access.",
      410
    )
  );
}
