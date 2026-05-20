import { created, errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { certificateIssueSchema } from "@/lib/validation";
import { issueCertificate, listCertificates } from "@/server/modules/certificates/service";
import { getScopedStudentIdsForObserver } from "@/server/modules/observer/scope";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.roles.includes("admin")) {
      return ok(await listCertificates());
    }
    if (user.roles.includes("customer_observer")) {
      const scopedStudentIds = await getScopedStudentIdsForObserver(user.id);
      return ok(await listCertificates({ userIds: scopedStudentIds ?? [] }));
    }
    return ok(await listCertificates({ userId: user.id }));
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

