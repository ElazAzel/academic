import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { generateCertificatePdf } from "@/server/modules/certificates/service";

type Context = { params: Promise<{ certificateId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await requireUser();
    const { certificateId } = await context.params;
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
