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

    // If correctAnswer.value is an ID (like "a") and options are [{id,label},...],
    // resolve the ID to the matching label so it can be compared against the student's answer
    if (typeof expected === "string" && Array.isArray(question.options) && question.options.length > 0) {
      const firstOpt = question.options[0];
      if (typeof firstOpt === "object" && firstOpt !== null && "id" in firstOpt) {
        const matched = (question.options as Array<{ id?: string; label?: string }>).find((o) => o.id === expected);
        if (matched) expected = matched.label ?? matched.id;
      } else if (typeof expected === "string" && expected.length <= 3 && Array.isArray(question.options)) {
        const idx = parseInt(expected, 10);
        if (!isNaN(idx) && idx >= 0 && idx < question.options.length) {
          expected = question.options[idx];
        }
      }
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

/** Публичный список квизов (без correctAnswer — C2) */
export async function listQuizzes() {
  const quizzes = await prisma.quiz.findMany({
    include: {
      course: { select: { id: true, title: true } },
      lesson: { select: { id: true, title: true } },
      questions: { orderBy: { order: "asc" } }
    },
    orderBy: { createdAt: "desc" }
  });
  // Удаляем correctAnswer из вопросов для всех не-privileged запросов
  return stripAnswerKeys(quizzes);
}

/** Удаляет correctAnswer из списка квизов */
function stripAnswerKeys(quizzes: unknown[]): unknown[] {
  return quizzes.map((q) => {
    const quiz = q as Record<string, unknown>;
    if (Array.isArray(quiz.questions)) {
      quiz.questions = quiz.questions.map((question: Record<string, unknown>) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
const { correctAnswer, ...rest } = question;
        return rest;
      });
    }
    return quiz;
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

