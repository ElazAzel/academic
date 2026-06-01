import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export async function listAdminCohorts() {
  return prisma.cohort.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { title: true } },
      _count: { select: { enrollments: true, curatorAssignments: true } },
    },
  });
}

export async function getActiveCohortsForSelector() {
  return prisma.cohort.findMany({
    where: { status: "active" },
    select: {
      id: true,
      name: true,
      course: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listPopupTargetingCohorts() {
  return prisma.cohort.findMany({
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
}
