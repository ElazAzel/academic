import { randomUUID } from "node:crypto";
import type { QuizQuestion, EnrollmentStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { toJsonValue } from "@/lib/json";
import { logAudit } from "@/server/modules/audit/service";
import { markLessonProgress } from "@/server/modules/progress/service";
import { awardXp } from "@/server/actions/xp";
import { checkAndAward } from "@/server/modules/gamification/achievements";
import {
  canReadCourseAnswerKeys,
  quizReadWhereForActor,
  type CourseAccessActor,
} from "@/server/modules/courses/access";

const prisma = getPrisma();

export type ObjectiveQuestion = Pick<QuizQuestion, "id" | "type" | "correctAnswer" | "points">;

/**
 * Resolve a value through the options array to get a comparable label.
 *
 * Handles:
 * - Numeric index → option label/value at that index
 * - String ID on object options → matching label
 * - Plain value → returned as-is
 */
function resolveOptionLabel(val: unknown, options: unknown[]): string {
  if (val === null || val === undefined) return "";
  const strVal = String(val);

  if (Array.isArray(options) && options.length > 0) {
    // Numeric index → option
    const idx = parseInt(strVal, 10);
    if (!isNaN(idx) && idx >= 0 && idx < options.length && String(idx) === strVal) {
      const opt = options[idx];
      if (typeof opt === "object" && opt !== null) {
        const o = opt as Record<string, unknown>;
        return String(o.label ?? o.id ?? strVal);
      }
      return String(opt);
    }

    // ID match on object options
    if (typeof options[0] === "object" && options[0] !== null) {
      const firstOpt = options[0] as Record<string, unknown>;
      if ("id" in firstOpt) {
        const matched = (options as Array<Record<string, unknown>>).find(
          (o) => String(o.id) === strVal
        );
        if (matched) return String(matched.label ?? matched.id);
      }
    }
  }

  return strVal;
}

/**
 * Normalise a value or array of values to a sorted array of strings
 * for comparison. Unlike resolveOptionLabel, this is used for comparison
 * and does NOT resolve through options — it just stringifies.
 */
function toComparableStrings(value: unknown, options: unknown[]): string[] {
  if (value === null || value === undefined) return [];

  const vals = Array.isArray(value) ? value : [value];
  return vals.map((v) => resolveOptionLabel(v, options)).sort();
}

/**
 * Recursively extract the raw expected answer value(s) from a correctAnswer field.
 *
 * Handles all known storage formats:
 *   { value: "a" }              → "a"
 *   { values: ["b", "c"] }      → ["b", "c"]
 *   { index: 0 }                → 0
 *   { value: { index: 1 } }     → 1          (nested — happens when createQuizInline
 *                                               double-wraps an already-formatted object)
 *   "Paris"                     → "Paris"
 *   0                           → 0
 */
function extractCorrectAnswer(correct: unknown): unknown {
  if (correct === null || correct === undefined) return correct;

  while (typeof correct === "object" && !Array.isArray(correct)) {
    const obj = correct as Record<string, unknown>;
    if ("values" in obj) return obj.values;
    if ("value" in obj) {
      correct = obj.value;
      continue; // may be nested again (e.g. { value: { index: 1 } })
    }
    if ("index" in obj) return obj.index;
    break;
  }
  return correct;
}

export function gradeObjectiveQuiz(
  questions: (ObjectiveQuestion & { options?: unknown })[],
  answers: Record<string, unknown>,
  passThreshold: number
) {
  const total = questions.reduce((sum, question) => sum + question.points, 0);
  const earned = questions.reduce((sum, question) => {
    const correct = question.correctAnswer;
    const opts = Array.isArray(question.options) ? question.options : [];
    const rawExpected = extractCorrectAnswer(correct);

    const actual = answers[question.id];
    const expectedStrs = toComparableStrings(rawExpected, opts);
    const actualStrs = toComparableStrings(actual, opts);
    const match =
      expectedStrs.length === actualStrs.length &&
      expectedStrs.every((v, i) => v === actualStrs[i]);

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

export async function listQuizzes(actor: CourseAccessActor) {
  const quizzes = await prisma.quiz.findMany({
    where: quizReadWhereForActor(actor),
    include: {
      course: { select: { id: true, title: true } },
      lesson: { select: { id: true, title: true } },
      questions: { orderBy: { order: "asc" } }
    },
    orderBy: { createdAt: "desc" }
  });
  return stripAnswerKeys(quizzes);
}

function stripAnswerKeys(quizzes: unknown[]): unknown[] {
  return quizzes.map((q) => {
    const quiz = q as Record<string, unknown>;
    if (Array.isArray(quiz.questions)) {
      quiz.questions = quiz.questions.map((question: Record<string, unknown>) => {
         
        const { correctAnswer, ...rest } = question;
        return rest;
      });
    }
    return quiz;
  });
}

function stripAnswerKeysFromQuiz<T extends Record<string, unknown>>(quiz: T): T {
  return stripAnswerKeys([quiz])[0] as T;
}

export async function getQuizForActor(actor: CourseAccessActor, quizId: string) {
  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      ...quizReadWhereForActor(actor),
    },
    include: {
      questions: { orderBy: { order: "asc" } },
      course: { select: { id: true, title: true } },
      lesson: {
        select: {
          id: true,
          title: true,
          module: { select: { courseId: true } },
        },
      },
    },
  });

  if (!quiz) {
    throw new ApiError("not_found", "Тест не найден", 404);
  }

  const courseId = quiz.courseId ?? quiz.lesson?.module.courseId;
  if (!courseId || !(await canReadCourseAnswerKeys(actor, courseId))) {
    return stripAnswerKeysFromQuiz(quiz as unknown as Record<string, unknown>);
  }

  return quiz;
}

export async function importQuestions(quizId: string, questionIds: string[], actorId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      course: { select: { id: true } },
      lesson: { select: { module: { select: { courseId: true } } } },
    },
  });
  if (!quiz) throw new ApiError("not_found", "Тест не найден", 404);
  const courseId = quiz.courseId ?? quiz.lesson?.module.courseId;
  if (!courseId) throw new ApiError("bad_request", "Тест не привязан к курсу", 400);

  const { assertInstructorOfCourse } = await import("@/server/modules/course-builder/service");
  await assertInstructorOfCourse(actorId, courseId);

  const uniqueQuestionIds = [...new Set(questionIds)];

  const sourceQuestions = await prisma.quizQuestion.findMany({
    where: {
      id: { in: uniqueQuestionIds },
      quiz: {
        OR: [
          { courseId },
          { lesson: { module: { courseId } } },
        ],
      },
    },
  });

  if (sourceQuestions.length !== uniqueQuestionIds.length) {
    throw new ApiError("not_found", "Вопросы не найдены или недоступны", 404);
  }

  const sourceById = new Map(sourceQuestions.map((question) => [question.id, question]));
  const orderedSourceQuestions = uniqueQuestionIds.map((id) => sourceById.get(id)!);

  const maxOrder = await prisma.quizQuestion.aggregate({
    where: { quizId },
    _max: { order: true },
  });

  let order = (maxOrder._max.order ?? -1) + 1;

  const created = await prisma.$transaction(
    orderedSourceQuestions.map((q) =>
      prisma.quizQuestion.create({
        data: {
          id: randomUUID(),
          quizId,
          type: q.type,
          prompt: q.prompt,
          options: toJsonValue(q.options),
          correctAnswer: toJsonValue(q.correctAnswer),
          points: q.points,
          order: order++,
        },
      })
    )
  );

  return created;
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
  const result = gradeObjectiveQuiz(quiz.questions, answers, quiz.passThreshold);

  const attempt = await prisma.$transaction(async (tx) => {
    if (!skipLimit) {
      // Блокируем enrollment per-user-per-course как mutex для сериализации
      // проверки лимита попыток (FOR UPDATE гарантирует, что второй concurrent
      // запрос дождётся коммита первого)
      await tx.$queryRaw(
        Prisma.sql`SELECT 1 FROM "enrollments" WHERE "user_id" = ${userId} AND "course_id" = ${resolvedCourseId} FOR UPDATE`
      );
      const attempts = await tx.quizAttempt.count({ where: { quizId, userId } });
      if (attempts >= quiz.maxAttempts) {
        throw new ApiError("forbidden", "Лимит попыток исчерпан", 403);
      }
    }

    return tx.quizAttempt.create({
      data: {
        quizId,
        userId,
        answers: answers as Prisma.InputJsonValue,
        score: result.score,
        passed: result.passed,
        submittedAt: new Date()
      }
    });
  });
  await logAudit({
    actorId: userId,
    action: "quiz.attempt_submitted",
    entity: "quiz_attempt",
    entityId: attempt.id,
    metadata: { quizId, score: result.score, passed: result.passed }
  });

  let xpResult = null;
  try {
    xpResult = await awardXp(userId, result.passed ? "quiz_pass" : "quiz_attempt");
  } catch (err) {
    console.error("Failed to award quiz XP:", err);
  }

  try {
    await checkAndAward(userId, result.passed ? "quiz_pass" : "lesson_complete");
    if (result.passed && result.earned === result.total) {
      await checkAndAward(userId, "quiz_perfect");
    }
  } catch (err) {
    console.error("Failed to check achievements for quiz:", err);
  }

  if (result.passed && quiz.lessonId) {
    await markLessonProgress(userId, quiz.lessonId, 100);
  }

  return { ...attempt, grading: result, xp: xpResult };
}

