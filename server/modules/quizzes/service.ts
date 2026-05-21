import { randomUUID } from "node:crypto";
import type { Prisma, QuizQuestion, EnrollmentStatus } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { toJsonValue } from "@/lib/json";
import { logAudit } from "@/server/modules/audit/service";
import { markLessonProgress } from "@/server/modules/progress/service";
import {
  canReadCourseAnswerKeys,
  quizReadWhereForActor,
  type CourseAccessActor,
} from "@/server/modules/courses/access";

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
    const correct = question.correctAnswer;
    let expected: unknown = undefined;

    // Helper to resolve an individual answer (either an index or a label/ID) to its string representation
    const resolveOption = (val: unknown): unknown => {
      if (val === null || val === undefined) return val;
      if (Array.isArray(question.options)) {
        // If options are objects like [{id, label}, ...]
        if (question.options.length > 0 && typeof question.options[0] === "object" && question.options[0] !== null) {
          const firstOpt = question.options[0] as Record<string, unknown>;
          if ("id" in firstOpt) {
            const matched = (question.options as Array<{ id?: string; label?: string }>).find(
              (o) => String(o.id) === String(val)
            );
            if (matched) return matched.label ?? matched.id;
          }
        }

        // Otherwise check if it is a numeric index
        const strVal = String(val);
        const idx = parseInt(strVal, 10);
        if (!isNaN(idx) && idx >= 0 && idx < question.options.length && String(idx) === strVal) {
          return question.options[idx];
        }
      }
      return val;
    };

    if (correct !== null && correct !== undefined) {
      if (typeof correct === "object" && !Array.isArray(correct)) {
        const correctObj = correct as Record<string, unknown>;
        if ("values" in correctObj && Array.isArray(correctObj.values)) {
          expected = correctObj.values.map(resolveOption);
        } else if ("value" in correctObj) {
          expected = resolveOption(correctObj.value);
        } else if ("index" in correctObj) {
          const idx = typeof correctObj.index === "number" ? correctObj.index : parseInt(String(correctObj.index), 10);
          if (!isNaN(idx) && Array.isArray(question.options) && idx >= 0 && idx < question.options.length) {
            expected = question.options[idx];
          }
        }
      } else {
        if (Array.isArray(correct)) {
          expected = correct.map(resolveOption);
        } else {
          expected = resolveOption(correct);
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    include: { course: { select: { id: true } } },
  });
  if (!quiz) throw new ApiError("not_found", "Тест не найден", 404);
  if (!quiz.course) throw new ApiError("bad_request", "Тест не привязан к курсу", 400);

  const { assertInstructorOfCourse } = await import("@/server/modules/course-builder/service");
  await assertInstructorOfCourse(actorId, quiz.course.id);

  const sourceQuestions = await prisma.quizQuestion.findMany({
    where: { id: { in: questionIds } },
  });

  if (sourceQuestions.length === 0) throw new ApiError("bad_request", "Вопросы не найдены", 400);

  const maxOrder = await prisma.quizQuestion.aggregate({
    where: { quizId },
    _max: { order: true },
  });

  let order = (maxOrder._max.order ?? -1) + 1;

  const created = await prisma.$transaction(
    sourceQuestions.map((q) =>
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

  if (result.passed && quiz.lessonId) {
    await markLessonProgress(userId, quiz.lessonId, 100);
  }

  return { ...attempt, grading: result };
}

