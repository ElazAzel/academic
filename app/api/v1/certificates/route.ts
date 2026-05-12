import { created, errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { certificateIssueSchema } from "@/lib/validation";
import { issueCertificate, listCertificates } from "@/server/modules/certificates/service";

export async function GET() {
  try {
    const user = await requireUser();
    const canSeeAll = user.roles.includes("admin") || user.roles.includes("customer_observer");
    return ok(await listCertificates(canSeeAll ? undefined : { userId: user.id }));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser("certificates:issue");
    const input = await parseJson(request, certificateIssueSchema);
    return created(await issueCertificate(input, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

