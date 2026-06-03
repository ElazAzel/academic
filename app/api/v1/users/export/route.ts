import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { ApiError, errorResponse, getSafeErrorMetadata } from "@/lib/http";

const prisma = getPrisma();

function csvCell(value: Date | string | null | undefined) {
  const raw = value instanceof Date ? value.toISOString().slice(0, 10) : value ?? "";
  const protectedValue = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser("users:read");
    if (!user.roles.includes("admin") && !user.roles.includes("super_curator")) {
      throw new ApiError("forbidden", "Экспорт пользователей доступен только администратору или супер-куратору", 403);
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
      [
        csvCell(u.name),
        csvCell(u.email),
        csvCell(u.organization),
        csvCell(u.status),
        csvCell(u.lastLoginAt),
        csvCell(u.createdAt),
      ].join(",")
    ).join("\n");

    return new NextResponse(`\uFEFF${header}\n${rows}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="users_export.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }

    console.error("[Users Export] Error", getSafeErrorMetadata(error));
    return errorResponse(new ApiError("internal_error", "Не удалось экспортировать пользователей", 500));
  }
}
