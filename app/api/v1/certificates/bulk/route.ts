import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { errorResponse, ApiError, parseJson } from "@/lib/http";
import { generateCertificatePdf } from "@/server/modules/certificates/service";
import { getScopedStudentIdsForObserver } from "@/server/modules/observer/scope";
import { checkRateLimit } from "@/lib/security/rate-limit";
 
const archiver = require("archiver") as typeof import("archiver");
import { z } from "zod";

const prisma = getPrisma();
const bulkSchema = z.object({
  certificateIds: z.array(z.string().min(1)).min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const isAdmin = user.roles.includes("admin");
    const isObserver = user.roles.includes("customer_observer");
    if (!isAdmin && !isObserver) {
      throw new ApiError("forbidden", "Только администратор или заказчик может скачивать сертификаты массово", 403);
    }

    // Rate limit: 5 bulk downloads per user per window
    const rl = await checkRateLimit(`certificates-bulk:${user.id}`);
    if (!rl.allowed) {
      throw new ApiError("too_many_requests", "Слишком много запросов. Попробуйте позже.", 429);
    }

    const body = await parseJson(request, bulkSchema);
    const { certificateIds } = body;
    const scopedStudentIds = isObserver ? await getScopedStudentIdsForObserver(user.id) : undefined;

    const certs = await prisma.certificate.findMany({
      where: {
        id: { in: certificateIds },
        revokedAt: null,
        ...(isObserver ? { userId: { in: scopedStudentIds ?? [] } } : {}),
      },
      select: {
        id: true,
        number: true,
        userId: true,
        courseId: true,
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
    });

    if (certs.length !== certificateIds.length) {
      throw new ApiError("not_found", "Некоторые сертификаты не найдены", 404);
    }

    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    const archivePromise = new Promise<void>((resolve, reject) => {
      archive.on("end", () => resolve());
      archive.on("error", reject);
    });

    for (const cert of certs) {
      try {
        const pdfBytes = await generateCertificatePdf(cert.id);
        const studentName = (cert.user?.name ?? "student").replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "");
        const filename = `Сертификат_${cert.number}_${studentName}.pdf`;
        archive.append(Buffer.from(pdfBytes), { name: filename });
      } catch (err) {
        console.error(`Failed to generate PDF for certificate ${cert.id}:`, err);
      }
    }

    await archive.finalize();
    await archivePromise;

    const zipBuffer = Buffer.concat(chunks);
    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="certificates-bulk.zip"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
