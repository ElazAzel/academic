import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { issueCertificate } from "@/server/modules/certificates/service";

export const dynamic = "force-dynamic";

/**
 * One-time endpoint to issue a demo certificate on production.
 * Protected by SEED_ADMIN_TOKEN.
 * DELETE THIS FILE after use.
 */
export async function POST(request: Request) {
  const expectedToken = process.env.SEED_ADMIN_TOKEN;
  if (!expectedToken || expectedToken.length < 16) {
    return NextResponse.json({ error: "SEED_ADMIN_TOKEN not configured" }, { status: 401 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!bearerToken || bearerToken !== expectedToken) {
    return NextResponse.json({ error: "Invalid or missing bearer token" }, { status: 401 });
  }

  try {
    const prisma = getPrisma();

    // 1. Find admin and student1
    const admin = await prisma.user.findUnique({ where: { email: "admin@academy.local" } });
    if (!admin) return NextResponse.json({ error: "admin@academy.local not found" }, { status: 404 });

    const student = await prisma.user.findUnique({ where: { email: "student1@academy.local" } });
    if (!student) return NextResponse.json({ error: "student1@academy.local not found" }, { status: 404 });

    // 2. Find the course
    const course = await prisma.course.findUnique({ where: { slug: "strategic-thinking-masterclass" } });
    if (!course) return NextResponse.json({ error: "Course strategic-thinking-masterclass not found. Run seed-temp first." }, { status: 404 });

    // 3. Check if certificate already exists
    const existing = await prisma.certificate.findFirst({
      where: { userId: student.id, courseId: course.id },
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Certificate already exists",
        certificate: {
          id: existing.id,
          number: existing.number,
          verificationCode: existing.verificationCode,
          verificationUrl: existing.verificationUrl,
          issuedAt: existing.issuedAt,
        },
      });
    }

    // 4. Ensure enrollment exists
    const enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
      update: { status: "ACTIVE" },
      create: { userId: student.id, courseId: course.id, status: "ACTIVE" },
    });

    // 5. Complete all lessons for this course
    const allLessons = await prisma.lesson.findMany({
      where: { module: { courseId: course.id } },
      select: { id: true },
    });

    for (const lesson of allLessons) {
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId: student.id, lessonId: lesson.id } },
        update: { status: "COMPLETED", completedAt: new Date() },
        create: { userId: student.id, lessonId: lesson.id, status: "COMPLETED", completedAt: new Date() },
      });
    }

    // 6. Set course progress to 100%
    await prisma.courseProgress.upsert({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
      update: { percent: 100, status: "COMPLETED", completedAt: new Date() },
      create: {
        userId: student.id,
        courseId: course.id,
        enrollmentId: enrollment.id,
        percent: 100,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // 7. Issue the certificate
    const cert = await issueCertificate({ userId: student.id, courseId: course.id }, admin.id);

    return NextResponse.json({
      success: true,
      message: "Demo certificate issued successfully!",
      certificate: {
        id: cert.id,
        number: cert.number,
        verificationCode: cert.verificationCode,
        verificationUrl: cert.verificationUrl,
        issuedAt: cert.issuedAt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
