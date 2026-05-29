import { z } from "zod";
import { ApiError, created, errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { claimCertificateForCourse } from "@/server/modules/certificates/service";

const certificateClaimSchema = z.object({
  courseId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user.roles.includes("student")) {
      throw new ApiError("forbidden", "Получить свой сертификат может только студент", 403);
    }

    const input = await parseJson(request, certificateClaimSchema);
    const result = await claimCertificateForCourse(user.id, input.courseId);

    return result.alreadyIssued ? ok(result) : created(result);
  } catch (error) {
    return errorResponse(error);
  }
}
