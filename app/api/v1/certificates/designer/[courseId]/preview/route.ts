import { NextResponse } from "next/server";
import { errorResponse, ApiError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { generateDraftCertificatePdf } from "@/server/modules/certificates/service";
import { z } from "zod";

const prisma = getPrisma();

type Context = { params: Promise<{ courseId: string }> };

const previewBodySchema = z.object({}).passthrough();

async function parseOptionalPreviewBody(request: Request) {
  const text = await request.text();
  if (!text.trim()) return {};

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new ApiError("bad_request", "Тело запроса должно быть JSON", 400);
  }

  return previewBodySchema.parse(payload);
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { courseId } = await context.params;

    // Проверка прав: только админ или преподаватель данного курса
    const isAdmin = user.roles.includes("admin");
    const isInstructor = await prisma.courseInstructor.findFirst({
      where: { courseId, userId: user.id },
    });

    if (!isAdmin && !isInstructor) {
      throw new ApiError("forbidden", "Нет доступа к редактору шаблонов этого курса", 403);
    }

    const body = await parseOptionalPreviewBody(request);
    const pdf = await generateDraftCertificatePdf(courseId, body);

    const safeFilename = `Шаблон_Предпросмотр_${courseId}.pdf`;
    const encodedFilename = encodeURIComponent(safeFilename);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
