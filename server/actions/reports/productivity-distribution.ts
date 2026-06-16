"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth/page-guards";
import { calculateForUser } from "@/server/modules/productivity-score/service";
import { getScopedStudentIdsForObserver } from "@/server/modules/observer/scope";
import type { ProductivityLevel } from "@/server/modules/productivity-score/service";

interface ProductivityLevelCount {
  level: ProductivityLevel;
  count: number;
  percentage: number;
}

export interface ProductivityDistribution {
  levels: ProductivityLevelCount[];
  averageScore: number;
  totalStudents: number;
}

const ReportScopeSchema = z.object({
  type: z.string(),
  cohortId: z.string().optional(),
  courseIds: z.array(z.string()),
  studentIds: z.array(z.string()),
  organizationId: z.string().optional(),
});

export async function getProductivityDistribution(
  scope: unknown,
): Promise<ProductivityDistribution | null> {
  const actor = await requireRole(["admin", "instructor", "curator", "super_curator", "customer_observer"]);
  const parsedScope = ReportScopeSchema.parse(scope);

  const scopedIds = actor.roles.includes("customer_observer")
    ? await getScopedStudentIdsForObserver(actor.id)
    : undefined;
  const studentIds = scopedIds ?? parsedScope.studentIds;

  if (!studentIds.length || !parsedScope.courseIds.length) return null;

  const levelCounts: Record<ProductivityLevel, number> = {
    champion: 0,
    advanced: 0,
    practitioner: 0,
    beginner: 0,
  };
  let totalScore = 0;
  let processedCount = 0;

  for (const studentId of studentIds) {
    for (const courseId of parsedScope.courseIds) {
      try {
        const result = await calculateForUser(studentId, courseId);
        levelCounts[result.level]++;
        totalScore += result.totalScore;
        processedCount++;
      } catch (err) {
        console.error(`Failed to calculate productivity score for student ${studentId}, course ${courseId}:`, err);
      }
    }
  }

  if (!processedCount) return null;

  const averageScore = Math.round((totalScore / processedCount) * 100) / 100;
  const levels: ProductivityLevelCount[] = (Object.entries(levelCounts) as [ProductivityLevel, number][])
    .filter(([, count]) => count > 0)
    .map(([level, count]) => ({
      level,
      count,
      percentage: Math.round((count / processedCount) * 10000) / 100,
    }));

  return { levels, averageScore, totalStudents: processedCount };
}
