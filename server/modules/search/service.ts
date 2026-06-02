import { getPrisma } from "@/lib/prisma";
import { courseReadWhereForActor, type CourseAccessActor } from "@/server/modules/courses/access";

const prisma = getPrisma();

export async function searchAcademy(query: string, actor: CourseAccessActor, includeUsers = false) {
  const normalized = query.trim();
  if (!normalized) {
    return { courses: [], lessons: [], users: [] };
  }

  const courseWhere = courseReadWhereForActor(actor);

  const [courses, lessons, users] = await Promise.all([
    prisma.course.findMany({
      where: {
        AND: [
          courseWhere,
          {
            OR: [
              { title: { contains: normalized, mode: "insensitive" } },
              { description: { contains: normalized, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: { id: true, title: true, description: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.lesson.findMany({
      where: {
        module: { course: courseWhere },
        OR: [
          { title: { contains: normalized, mode: "insensitive" } },
          { summary: { contains: normalized, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, summary: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    includeUsers
      ? prisma.user.findMany({
          where: {
            OR: [
              { email: { contains: normalized, mode: "insensitive" } },
              { name: { contains: normalized, mode: "insensitive" } }
            ]
          },
          select: { id: true, email: true, name: true },
          take: 10
        })
      : Promise.resolve([])
  ]);

  return { courses, lessons, users };
}
