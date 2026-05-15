import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";

const prisma = getPrisma();

// GET /api/v1/cohorts — list all active cohorts (for popup targeting)
export async function GET() {
  try {
    await requireUser();
    // Any authenticated user can list cohorts for selection purposes
    const cohorts = await prisma.cohort.findMany({
      where: {
        status: { not: "archived" },
      },
      select: {
        id: true,
        name: true,
        course: { select: { title: true } },
        status: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      data: cohorts.map((c) => ({
        id: c.id,
        name: c.name,
        courseTitle: c.course?.title ?? "",
        status: c.status,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: { code: "internal_error", message } }, { status: 500 });
  }
}
