import { RoleKey } from "@prisma/client";
import { z } from "zod";

export const courseSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(10),
  goal: z.string().max(500).optional(),
  coverUrl: z.string().url().optional(),
  durationHours: z.number().int().min(0).max(1000).default(0),
  traversalMode: z.enum(["sequential", "open"]).default("sequential")
});

export const updateCourseSchema = courseSchema.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  traversalMode: z.enum(["sequential", "open"]).optional(),
});

export const moduleSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().optional(),
  order: z.number().int().positive(),
  recommendedDays: z.number().int().positive().default(7)
});

export const lessonSchema = z.object({
  title: z.string().min(2).max(160),
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
  answerText: z.string().max(10_000).optional(),
  fileUrl: z.string().url().optional()
});

export const progressSchema = z.object({
  lessonId: z.string().min(1),
  percent: z.number().int().min(0).max(100)
});

export const lessonQuestionSchema = z.object({
  text: z.string().trim().min(5).max(3000)
});

export const roleAssignmentSchema = z.object({
  roles: z.array(z.nativeEnum(RoleKey)).min(1).max(6)
});

export const certificateIssueSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1)
});

export const checkoutSchema = z.object({
  courseId: z.string().min(1),
  priceCents: z.number().int().positive(),
  currency: z.string().length(3).default("usd"),
  type: z.enum(["ONE_TIME", "SUBSCRIPTION"]).default("ONE_TIME")
});
