import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export async function GET(request: Request) {
  try {
    const user = await requireUser("users:read");
    if (!user.roles.includes("admin") && !user.roles.includes("super_curator")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where: where as Prisma.UserWhereInput,
      orderBy: { createdAt: "desc" },
      select: { name: true, email: true, organization: true, status: true, lastLoginAt: true, createdAt: true },
    });

    const header = "Имя,Email,Реальное имя,Статус,Последний вход,Дата создания";
    const rows = users.map((u) =>
      `"${u.name ?? ""}","${u.email}","${u.organization ?? ""}","${u.status}","${u.lastLoginAt?.toISOString().slice(0, 10) ?? ""}","${u.createdAt.toISOString().slice(0, 10)}"`
    ).join("\n");

    return new NextResponse(`\uFEFF${header}\n${rows}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="users_export.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
