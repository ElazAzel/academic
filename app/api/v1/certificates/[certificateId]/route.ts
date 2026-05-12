import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { revokeCertificate } from "@/server/modules/certificates/service";

type Context = { params: Promise<{ certificateId: string }> };

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireUser("certificates:issue");
    const { certificateId } = await context.params;
    return ok(await revokeCertificate(certificateId, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
