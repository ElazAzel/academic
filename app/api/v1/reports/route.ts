import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const isAdmin = user.roles.includes("admin");
    const isSuperCurator = user.roles.includes("super_curator");
    const isCurator = user.roles.includes("curator");
    const isObserver = user.roles.includes("customer_observer");

    if (!isAdmin && !isSuperCurator && !isCurator && !isObserver) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    let csvContent = "";
    let filename = "";

    // Для super_curator: scoped к своим кураторам
    const getScopedStudentIds = async () => {
      if (!isSuperCurator || isAdmin) return null;
      const assignments = await prisma.curatorAssignment.findMany({
        where: { superCuratorId: user.id, active: true },
        select: { studentId: true },
      });
      return assignments.map(a => a.studentId);
    };

    if (type === "progress") {
      const scopedIds = await getScopedStudentIds();
      const where = scopedIds ? { userId: { in: scopedIds } } : {};
      const enrollments = await prisma.enrollment.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true } },
          cohort: { select: { name: true } },
          courseProgress: true
        }
      });
      csvContent = "User,Email,Course,Cohort,Progress (%)\n";
      enrollments.forEach(e => {
        const progress = Array.isArray(e.courseProgress) && e.courseProgress.length > 0 ? e.courseProgress[0].percent : 0;
        csvContent += `"${e.user.name || ""}","${e.user.email}","${e.course.title}","${e.cohort?.name || ""}","${progress}"\n`;
      });
      filename = "progress_report.csv";
    } else if (type === "risk") {
      const scopedIds = await getScopedStudentIds();
      const where = scopedIds ? { userId: { in: scopedIds } } : {};
      const risks = await prisma.riskFlag.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true } }
        }
      });
      csvContent = "User,Email,Course,Type,Severity,Status\n";
      risks.forEach(r => {
        csvContent += `"${r.user.name || ""}","${r.user.email}","${r.course?.title || ""}","${r.type}","${r.severity}","${r.status}"\n`;
      });
      filename = "risk_report.csv";
    } else if (type === "certificates") {
      const certs = await prisma.certificate.findMany({
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true } }
        }
      });
      csvContent = "Number,User,Email,Course,Issued At\n";
      certs.forEach(c => {
        csvContent += `"${c.number}","${c.user.name || ""}","${c.user.email}","${c.course.title}","${c.issuedAt.toISOString().slice(0, 10)}"\n`;
      });
      filename = "certificates_report.csv";
    } else if (type === "curator_progress" && isCurator) {
      const assigned = await prisma.curatorAssignment.findMany({
        where: { curatorId: user.id },
        select: { studentId: true }
      });
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: { in: assigned.map(a => a.studentId) } },
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true } },
          cohort: { select: { name: true } },
          courseProgress: true
        }
      });
      csvContent = "User,Email,Course,Cohort,Progress (%)\n";
      enrollments.forEach(e => {
        const progress = Array.isArray(e.courseProgress) && e.courseProgress.length > 0 ? e.courseProgress[0].percent : 0;
        csvContent += `"${e.user.name || ""}","${e.user.email}","${e.course.title}","${e.cohort?.name || ""}","${progress}"\n`;
      });
      filename = "curator_progress_report.csv";
    } else if (type === "curator_risk" && isCurator) {
      const assigned = await prisma.curatorAssignment.findMany({
        where: { curatorId: user.id },
        select: { studentId: true }
      });
      const risks = await prisma.riskFlag.findMany({
        where: { userId: { in: assigned.map(a => a.studentId) } },
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true } }
        }
      });
      csvContent = "User,Email,Course,Type,Severity,Status\n";
      risks.forEach(r => {
        csvContent += `"${r.user.name || ""}","${r.user.email}","${r.course?.title || ""}","${r.type}","${r.severity}","${r.status}"\n`;
      });
      filename = "curator_risk_report.csv";
    } else {
      return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
    }

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
