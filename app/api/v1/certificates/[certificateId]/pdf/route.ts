import { NextResponse } from "next/server";
import { errorResponse, ApiError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { generateCertificatePdf } from "@/server/modules/certificates/service";

const prisma = getPrisma();

type Context = { params: Promise<{ certificateId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { certificateId } = await context.params;

    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      select: { userId: true }
    });
    if (!certificate) {
      throw new ApiError("not_found", "Сертификат не найден", 404);
    }
    if (certificate.userId !== user.id && !user.roles.includes("admin")) {
      throw new ApiError("forbidden", "Нет доступа к сертификату", 403);
    }

    const pdf = await generateCertificatePdf(certificateId);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${certificateId}.pdf"`
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
