import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    if (!user.roles.includes("super_curator") && !user.roles.includes("customer_observer")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    let csvContent = "";
    let filename = "";

    if (type === "progress") {
      const enrollments = await prisma.enrollment.findMany({
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
      const risks = await prisma.riskFlag.findMany({
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
