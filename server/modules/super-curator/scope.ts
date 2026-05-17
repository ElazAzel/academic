import "server-only";

import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export interface SuperCuratorScopeAssignment {
  studentId: string;
  curatorId: string;
  cohortId: string;
}

export interface SuperCuratorScope {
  isGlobal: boolean;
  assignments: SuperCuratorScopeAssignment[];
  studentIds: string[];
  curatorIds: string[];
  cohortIds: string[];
}

export interface SuperCuratorActor {
  id: string;
  roles: string[];
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export async function getSuperCuratorScope(actor: SuperCuratorActor): Promise<SuperCuratorScope> {
  if (actor.roles.includes("admin")) {
    return {
      isGlobal: true,
      assignments: [],
      studentIds: [],
      curatorIds: [],
      cohortIds: [],
    };
  }

  const assignments = await prisma.curatorAssignment.findMany({
    where: { superCuratorId: actor.id, active: true },
    select: { studentId: true, curatorId: true, cohortId: true },
  });

  return {
    isGlobal: false,
    assignments,
    studentIds: unique(assignments.map((assignment) => assignment.studentId)),
    curatorIds: unique(assignments.map((assignment) => assignment.curatorId)),
    cohortIds: unique(assignments.map((assignment) => assignment.cohortId)),
  };
}

export function isStudentInSuperCuratorScope(scope: SuperCuratorScope, studentId: string) {
  return scope.isGlobal || scope.studentIds.includes(studentId);
}

export function isCuratorInSuperCuratorScope(scope: SuperCuratorScope, curatorId: string) {
  return scope.isGlobal || scope.curatorIds.includes(curatorId);
}

export function isCohortInSuperCuratorScope(scope: SuperCuratorScope, cohortId: string) {
  return scope.isGlobal || scope.cohortIds.includes(cohortId);
}
