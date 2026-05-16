import { RoleKey } from "@prisma/client";
import { z } from "zod";
import { ASSIGNMENT, COURSE, CURATOR_QUESTION, LESSON, MODULE, TRAVERSAL_MODES } from "@/lib/constants";

export const courseSchema = z.object({
  title: z.string().min(COURSE.TITLE_MIN_LENGTH).max(COURSE.TITLE_MAX_LENGTH),
  description: z.string().min(10),
  goal: z.string().max(COURSE.GOAL_MAX_LENGTH).optional(),
  coverUrl: z.string().url().optional(),
  durationHours: z.number().int().min(COURSE.MIN_DURATION_HOURS).max(COURSE.MAX_DURATION_HOURS).default(0),
  traversalMode: z.enum([TRAVERSAL_MODES.SEQUENTIAL, TRAVERSAL_MODES.OPEN]).default(TRAVERSAL_MODES.SEQUENTIAL)
});

export const updateCourseSchema = courseSchema.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  traversalMode: z.enum([TRAVERSAL_MODES.SEQUENTIAL, TRAVERSAL_MODES.OPEN]).optional(),
});

export const moduleSchema = z.object({
  title: z.string().min(MODULE.TITLE_MIN_LENGTH).max(MODULE.TITLE_MAX_LENGTH),
  description: z.string().optional(),
  order: z.number().int().positive(),
  recommendedDays: z.number().int().positive().default(MODULE.DEFAULT_RECOMMENDED_DAYS)
});

export const lessonSchema = z.object({
  title: z.string().min(LESSON.TITLE_MIN_LENGTH).max(LESSON.TITLE_MAX_LENGTH),
  summary: z.string().nullish(),
  order: z.number().int().positive(),
  type: z.enum(["VIDEO", "TEXT", "DOCUMENT", "VIDEO_DOCUMENT", "QUIZ", "ASSIGNMENT", "LIVE", "RECORDING", "MIXED"]).default("MIXED"),
  content: z.record(z.unknown()).default({}),
  videoUrl: z.string().nullish().or(z.literal("")),
  durationMinutes: z.number().int().min(0).default(0),
  isRequired: z.boolean().default(true)
});

export const enrollmentSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
  cohortId: z.string().min(1).optional()
});

export const quizAttemptSchema = z.object({
  answers: z.record(z.unknown())
});

export const assignmentSubmissionSchema = z.object({
  answerText: z.string().max(ASSIGNMENT.MAX_ANSWER_LENGTH).optional(),
  fileUrl: z.string().url().optional()
});

export const progressSchema = z.object({
  lessonId: z.string().min(1),
  percent: z.number().int().min(0).max(100)
});

export const lessonQuestionSchema = z.object({
  text: z.string().trim().min(CURATOR_QUESTION.TEXT_MIN_LENGTH).max(CURATOR_QUESTION.TEXT_MAX_LENGTH)
});

export const roleAssignmentSchema = z.object({
  roles: z.array(z.nativeEnum(RoleKey)).min(1).max(6)
});

export const certificateIssueSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1)
});

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  phone: z.string().trim().max(30).optional(),
  organization: z.string().trim().max(200).optional(),
  company: z.string().trim().max(200).optional(),
  position: z.string().trim().max(200).optional(),
});

export const checkoutSchema = z.object({
  courseId: z.string().min(1),
  priceCents: z.number().int().positive(),
  currency: z.string().length(3).default("usd"),
  type: z.enum(["ONE_TIME", "SUBSCRIPTION"]).default("ONE_TIME")
});

export const courseBuilderSettingsSchema = z.object({
  title: z.string().min(COURSE.TITLE_MIN_LENGTH).max(COURSE.TITLE_MAX_LENGTH).optional(),
  description: z.string().optional(),
  goal: z.string().max(COURSE.GOAL_MAX_LENGTH).nullish(),
  coverUrl: z.string().url().nullish().or(z.literal("")),
  durationHours: z.number().int().min(COURSE.MIN_DURATION_HOURS).max(COURSE.MAX_DURATION_HOURS).optional(),
  traversalMode: z.enum([TRAVERSAL_MODES.SEQUENTIAL, TRAVERSAL_MODES.OPEN]).optional(),
  completionThreshold: z.number().int().min(COURSE.MIN_COMPLETION_THRESHOLD).max(COURSE.MAX_COMPLETION_THRESHOLD).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional()
});

// ── Video provider schemas ──────────────────────────────────────────
export const lessonVideoSchema = z.object({
  provider: z.enum(["youtube", "bunny", "mux", "cloudflare", "peertube"]),
  providerVideoId: z.string().min(1, "ID видео обязателен"),
  originalUrl: z.string().optional(),
  embedUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  durationSeconds: z.number().optional(),
  isPrivate: z.boolean(),
});

export const videoBlockDataSchema = z.object({
  video: lessonVideoSchema.optional(),
  /** @deprecated Используйте `video` */
  videoUrl: z.string().default(""),
  title: z.string().optional(),
});

export const textBlockDataSchema = z.object({
  html: z.string().default(""),
});

export const fileBlockDataSchema = z.object({
  url: z.string().default(""),
  filename: z.string().optional(),
  fileType: z.string().optional(),
});

export const quizBlockDataSchema = z.object({
  quizId: z.string().default(""),
});

export const assignmentBlockDataSchema = z.object({
  assignmentId: z.string().default(""),
});

export const ratingBlockDataSchema = z.object({
  lessonId: z.string().default(""),
});

export const curatorQuestionBlockDataSchema = z.object({
  lessonId: z.string().default(""),
});

export const completionBlockDataSchema = z.object({
  label: z.string().optional(),
});

export const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string().min(1), type: z.literal("video"), data: videoBlockDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("text"), data: textBlockDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("file"), data: fileBlockDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("quiz"), data: quizBlockDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("assignment"), data: assignmentBlockDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("rating"), data: ratingBlockDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("curator_question"), data: curatorQuestionBlockDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("completion"), data: completionBlockDataSchema }),
]);

export const lessonBlocksSchema = z.object({
  blocks: z.array(contentBlockSchema).min(0).max(LESSON.CONTENT_BLOCKS_MAX_COUNT)
});

// ── FormData validation schemas (explicit parse of form fields) ──────
export const answerForwardedQuestionSchema = z.object({
  questionId: fromFormData(z.string().min(1, "ID вопроса обязателен")),
  answer: fromFormData(z.string().trim().min(1, "Ответ не может быть пустым").max(ASSIGNMENT.MAX_ANSWER_LENGTH, "Ответ слишком длинный")),
});

/** Converts null/undefined to empty string for Zod formData validation */
export function fromFormData(schema?: z.ZodString) {
  return z.preprocess((val) => (val == null ? "" : val), schema ?? z.string());
}

export const enrollStudentSchema = z.object({
  userId: fromFormData(z.string().min(1, "ID студента обязателен")),
  courseId: fromFormData(z.string().min(1, "ID курса обязателен")),
  cohortId: z.preprocess((val) => (val == null || val === "" ? undefined : val), z.string().optional()),
  curatorId: z.preprocess((val) => (val == null || val === "" ? undefined : val), z.string().optional()),
});

export const assignCuratorSchema = z.object({
  studentId: fromFormData(z.string().min(1, "ID студента обязателен")),
  curatorId: fromFormData(z.string().min(1, "ID куратора обязателен")),
  cohortId: fromFormData(z.string().min(1, "ID потока обязателен")),
});
