import { ApiError, errorResponse, ok } from "@/lib/http";
import { verifyCertificateByCode } from "@/server/modules/certificates/service";

type Context = { params: Promise<{ verificationCode: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { verificationCode } = await context.params;
    const certificate = await verifyCertificateByCode(verificationCode);
    if (!certificate) {
      throw new ApiError("not_found", "Сертификат не найден", 404);
    }
    return ok(certificate);
  } catch (error) {
    return errorResponse(error);
  }
}

