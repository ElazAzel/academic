import type { Prisma, QuizQuestion, EnrollmentStatus } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { logAudit } from "@/server/modules/audit/service";
import { markLessonProgress } from "@/server/modules/progress/service";

const prisma = getPrisma();

export type ObjectiveQuestion = Pick<QuizQuestion, "id" | "type" | "correctAnswer" | "points">;

function normalizeAnswer(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).sort();
  }
  return String(value);
}

export function gradeObjectiveQuiz(
  questions: (ObjectiveQuestion & { options?: unknown })[],
  answers: Record<string, unknown>,
  passThreshold: number
) {
  const total = questions.reduce((sum, question) => sum + question.points, 0);
  const earned = questions.reduce((sum, question) => {
    const correct = question.correctAnswer as { value?: unknown; values?: unknown[]; index?: number };
    let expected = correct.values ?? correct.value;

    // Handle legacy index-based correct answers
    if (expected === undefined && typeof correct.index === "number" && Array.isArray(question.options)) {
      expected = question.options[correct.index];
    }

    const actual = answers[question.id];
    const match = JSON.stringify(normalizeAnswer(expected)) === JSON.stringify(normalizeAnswer(actual));
    return sum + (match ? question.points : 0);
  }, 0);
  const score = total === 0 ? 0 : Math.round((earned / total) * 100);
  return {
    score,
    earned,
    total,
    passed: score >= passThreshold
  };
}

export async function listQuizzes() {
  return prisma.quiz.findMany({
    include: {
      course: { select: { id: true, title: true } },
      lesson: { select: { id: true, title: true } },
      questions: { orderBy: { order: "asc" } }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function submitQuizAttempt(quizId: string, userId: string, answers: Record<string, unknown>, skipLimit = false) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { order: "asc" } },
      lesson: { include: { module: { select: { courseId: true } } } }
    }
  });
  if (!quiz) {
    throw new ApiError("not_found", "Тест не найден", 404);
  }

  const resolvedCourseId = quiz.courseId ?? quiz.lesson?.module.courseId;
  if (!resolvedCourseId) {
    throw new ApiError("bad_request", "Тест не привязан к курсу", 400);
  }
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: resolvedCourseId } }
  });
  if (!enrollment || enrollment.status !== ("ACTIVE" as EnrollmentStatus)) {
    throw new ApiError("forbidden", "Нет доступа к тесту: вы не зачислены на курс", 403);
  }
  if (!skipLimit) {
    const attempts = await prisma.quizAttempt.count({ where: { quizId, userId } });
    if (attempts >= quiz.maxAttempts) {
      throw new ApiError("forbidden", "Лимит попыток исчерпан", 403);
    }
  }
  const result = gradeObjectiveQuiz(quiz.questions, answers, quiz.passThreshold);
  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      userId,
      answers: answers as Prisma.InputJsonValue,
      score: result.score,
      passed: result.passed,
      submittedAt: new Date()
    }
  });
  await logAudit({
    actorId: userId,
    action: "quiz.attempt_submitted",
    entity: "quiz_attempt",
    entityId: attempt.id,
    metadata: { quizId, score: result.score, passed: result.passed }
  });

  if (result.passed && quiz.lessonId) {
    await markLessonProgress(userId, quiz.lessonId, 100);
  }

  return { ...attempt, grading: result };
}

