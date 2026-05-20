import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export interface UserLearningPath {
  id: string;
  title: string;
  description: string;
  slug: string;
  progress: number;
  courseCount: number;
  completedCourses: number;
  status: string;
}

/**
 * Get all active learning paths for a user with calculated progress.
 *
 * Progress = average of CourseProgress.percent across all courses in the path.
 * Updates the stored `LearningPathEnrollment.progress` field.
 */
export async function getUserLearningPaths(userId: string): Promise<UserLearningPath[]> {
  const enrollments = await prisma.learningPathEnrollment.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      learningPath: {
        include: {
          courses: {
            include: {
              course: {
                select: {
                  id: true,
                  courseProgress: {
                    where: { userId },
                    select: { percent: true },
                  },
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  const results: UserLearningPath[] = [];

  for (const enrollment of enrollments) {
    const { learningPath } = enrollment;
    const courses = learningPath.courses;

    if (courses.length === 0) {
      results.push({
        id: learningPath.id,
        title: learningPath.title,
        description: learningPath.description,
        slug: learningPath.slug,
        progress: 0,
        courseCount: 0,
        completedCourses: 0,
        status: enrollment.status,
      });
      continue;
    }

    const totalPercent = courses.reduce((sum, lpc) => {
      const cp = lpc.course.courseProgress[0];
      return sum + (cp?.percent ?? 0);
    }, 0);

    const completedCount = courses.filter((lpc) => {
      const cp = lpc.course.courseProgress[0];
      return cp?.percent === 100;
    }).length;

    const avgProgress = Math.round(totalPercent / courses.length);

    // Update the stored progress field
    if (enrollment.progress !== avgProgress) {
      await prisma.learningPathEnrollment.update({
        where: { id: enrollment.id },
        data: { progress: avgProgress },
      }).catch(() => {
        // Non-critical, log and continue
        console.warn(`[LearningPath] Failed to update progress for enrollment ${enrollment.id}`);
      });
    }

    results.push({
      id: learningPath.id,
      title: learningPath.title,
      description: learningPath.description,
      slug: learningPath.slug,
      progress: avgProgress,
      courseCount: courses.length,
      completedCourses: completedCount,
      status: enrollment.status,
    });
  }

  return results;
}
