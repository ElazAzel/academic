import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export async function searchAcademy(query: string) {
  const normalized = query.trim();
  if (!normalized) {
    return { courses: [], lessons: [], users: [] };
  }

  const [courses, lessons, users] = await Promise.all([
    prisma.$queryRaw<{ id: string; title: string; description: string }[]>(Prisma.sql`
      SELECT id, title, description
      FROM courses
      WHERE to_tsvector('simple', title || ' ' || description) @@ plainto_tsquery('simple', ${normalized})
      ORDER BY ts_rank(to_tsvector('simple', title || ' ' || description), plainto_tsquery('simple', ${normalized})) DESC
      LIMIT 10
    `),
    prisma.$queryRaw<{ id: string; title: string; summary: string | null }[]>(Prisma.sql`
      SELECT id, title, summary
      FROM lessons
      WHERE to_tsvector('simple', title || ' ' || COALESCE(summary, '')) @@ plainto_tsquery('simple', ${normalized})
      ORDER BY ts_rank(to_tsvector('simple', title || ' ' || COALESCE(summary, '')), plainto_tsquery('simple', ${normalized})) DESC
      LIMIT 10
    `),
    prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: normalized, mode: "insensitive" } },
          { name: { contains: normalized, mode: "insensitive" } }
        ]
      },
      select: { id: true, email: true, name: true },
      take: 10
    })
  ]);

  return { courses, lessons, users };
}

