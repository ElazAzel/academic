import { NextResponse } from "next/server";
import { errorResponse, ApiError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { generateCertificatePdf } from "@/server/modules/certificates/service";
import { getScopedStudentIdsForObserver } from "@/server/modules/observer/scope";

const prisma = getPrisma();

type Context = { params: Promise<{ certificateId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser("certificates:read");
    const { certificateId } = await context.params;

    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      select: {
        userId: true,
        courseId: true,
        number: true,
        revokedAt: true,
        user: { select: { name: true } },
        course: { select: { title: true } },
      }
    });
    if (!certificate) {
      throw new ApiError("not_found", "Сертификат не найден", 404);
    }
    if (certificate.revokedAt) {
      throw new ApiError("forbidden", "Сертификат отозван и более недоступен для скачивания", 403);
    }

    let hasAccess = certificate.userId === user.id || user.roles.includes("admin");

    if (!hasAccess && user.roles.includes("instructor")) {
      const isInstructor = await prisma.courseInstructor.findFirst({
        where: { courseId: certificate.courseId, userId: user.id },
      });
      hasAccess = Boolean(isInstructor);
    }

    if (!hasAccess && user.roles.includes("customer_observer")) {
      const scopedStudentIds = await getScopedStudentIdsForObserver(user.id);
      hasAccess = (scopedStudentIds ?? []).includes(certificate.userId);
    }

    if (!hasAccess) {
      throw new ApiError("forbidden", "Нет доступа к сертификату", 403);
    }

    const pdf = await generateCertificatePdf(certificateId);
    const studentName = certificate.user.name ?? "student";
    const safeFilename = `Сертификат_${certificate.number}_${studentName.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "")}.pdf`;
    const encodedFilename = encodeURIComponent(safeFilename);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
