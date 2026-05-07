import { EnrollmentStatus, Prisma, ProgressStatus } from "@prisma/client";
import { ApiError } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import type {
  AssignmentSummary,
  ContinueLearning,
  LessonLearningSummary,
  LessonQuestionSummary,
  ModuleLearningDetail,
  StudentCourseLearningDetail,
  StudentLessonLearningDetail,
  StudentModuleLearningDetail,
  StudentProgress
} from "@/types/domain";

const prisma = getPrisma();

const courseLearningInclude = (userId: string) => ({
  cohort: { include: { deadlines: true } },
  courseProgress: { where: { userId } },
  course: {
    include: {
      instructors: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
      modules: {
        orderBy: { order: "asc" as const },
        include: {
          progress: { where: { userId } },
          deadlines: true,
          lessons: {
            orderBy: { order: "asc" as const },
            include: {
              progress: { where: { userId } }
            }
          }
        }
      }
    }
  }
}) satisfies Prisma.EnrollmentInclude;

type CourseEnrollment = Prisma.EnrollmentGetPayload<{ include: ReturnType<typeof courseLearningInclude> }>;

const lessonDetailInclude = (userId: string) => ({
  module: { include: { course: true } },
  media: true,
  quizzes: { include: { questions: { select: { id: true } } } },
  assignments: { include: { submissions: { where: { userId }, orderBy: { submittedAt: "desc" as const }, take: 1 } } },
  questions: { where: { studentId: userId }, orderBy: { createdAt: "desc" as const } }
}) satisfies Prisma.LessonInclude;

function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function getLessonProgress(lesson: CourseEnrollment["course"]["modules"][number]["lessons"][number]) {
  return lesson.progress[0] ?? null;
}

function buildLessonAccessMap(enrollment: CourseEnrollment) {
  const lockedReason = "Сначала завершите предыдущие обязательные уроки.";
  const orderedLessons = enrollment.course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ ...lesson, moduleOrder: module.order, moduleTitle: module.title }))
  );

  let previousRequiredLessonOpen = false;
  const accessByLessonId = new Map<string, LessonLearningSummary & { moduleId: string; moduleTitle: string }>();

  for (const lesson of orderedLessons) {
    const progress = getLessonProgress(lesson);
    const storedStatus = progress?.status ?? ProgressStatus.NOT_STARTED;
    const locked = enrollment.course.traversalMode === "sequential" && previousRequiredLessonOpen;
    const progressStatus = locked ? ProgressStatus.BLOCKED : storedStatus;

    accessByLessonId.set(lesson.id, {
      id: lesson.id,
      moduleId: lesson.moduleId,
      moduleTitle: lesson.moduleTitle,
      order: lesson.order,
      title: lesson.title,
      type: lesson.type,
      durationMinutes: lesson.durationMinutes,
      isRequired: lesson.isRequired,
      progressPercent: locked ? 0 : progress?.percent ?? 0,
      progressStatus,
      locked,
      lockReason: locked ? lockedReason : null
    });

    if (lesson.isRequired && storedStatus !== ProgressStatus.COMPLETED) {
      previousRequiredLessonOpen = true;
    }
  }

  return accessByLessonId;
}

function buildCourseLearningDetail(enrollment: CourseEnrollment): StudentCourseLearningDetail {
  const accessByLessonId = buildLessonAccessMap(enrollment);
  const course = enrollment.course;
  const courseProgress = enrollment.courseProgress[0];

  const modules: ModuleLearningDetail[] = course.modules.map((module) => {
    const lessons = module.lessons.map((lesson) => accessByLessonId.get(lesson.id)!);
    const completedLessons = lessons.filter((lesson) => lesson.progressStatus === ProgressStatus.COMPLETED).length;
    const computedPercent = lessons.length === 0 ? 0 : Math.round((completedLessons / lessons.length) * 100);
    const moduleProgress = module.progress[0];
    const modulePercent = moduleProgress?.percent ?? computedPercent;
    const deadline = enrollment.cohortId
      ? module.deadlines.find((item) => item.cohortId === enrollment.cohortId)
      : null;

    return {
      id: module.id,
      order: module.order,
      title: module.title,
      description: module.description,
      lessonsCount: lessons.length,
      recommendedDays: module.recommendedDays,
      status: module.status,
      progressPercent: modulePercent,
      progressStatus: moduleProgress?.status ?? (modulePercent > 0 ? ProgressStatus.IN_PROGRESS : ProgressStatus.NOT_STARTED),
      deadlineDate: deadline?.dueAt.toISOString() ?? null,
      lessons
    };
  });

  const allLessons = modules.flatMap((module) => module.lessons);
  const nextLesson = allLessons.find((lesson) => !lesson.locked && lesson.progressStatus !== ProgressStatus.COMPLETED);

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    coverUrl: course.coverUrl,
    durationHours: course.durationHours,
    status: course.status,
    traversalMode: course.traversalMode === "open" ? "open" : "sequential",
    modulesCount: modules.length,
    lessonsCount: allLessons.length,
    instructors: course.instructors.map((entry) => ({
      id: entry.user.id,
      name: entry.user.name ?? entry.user.email,
      email: entry.user.email,
      image: entry.user.image
    })),
    goal: course.goal,
    completionThreshold: course.completionThreshold,
    enrollmentId: enrollment.id,
    cohortName: enrollment.cohort?.name ?? null,
    coursePercent: courseProgress?.percent ?? 0,
    progressStatus: courseProgress?.status ?? ProgressStatus.NOT_STARTED,
    modules,
    nextLessonId: nextLesson?.id ?? null
  };
}

export async function getStudentCourses(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: EnrollmentStatus.ACTIVE },
    include: courseLearningInclude(userId),
    orderBy: { createdAt: "desc" }
  });
  return enrollments.map(buildCourseLearningDetail);
}

export async function getStudentCourseCards(userId: string): Promise<StudentProgress[]> {
  const courses = await getStudentCourses(userId);
  return courses.map((course) => {
    const nextLesson = course.modules.flatMap((module) => module.lessons).find((lesson) => lesson.id === course.nextLessonId);
    return {
      courseId: course.id,
      courseTitle: course.title,
      percent: course.coursePercent,
      status: course.progressStatus,
      currentModuleTitle: nextLesson?.moduleTitle,
      currentLessonTitle: nextLesson?.title,
      nextLessonId: nextLesson?.id
    };
  });
}

export async function getContinueLearning(userId: string): Promise<ContinueLearning | null> {
  const courses = await getStudentCourses(userId);
  for (const course of courses) {
    const nextLesson = course.modules.flatMap((module) => module.lessons).find((lesson) => lesson.id === course.nextLessonId);
    if (!nextLesson) {
      continue;
    }
    const courseModule = course.modules.find((item) => item.id === nextLesson.moduleId);
    return {
      courseId: course.id,
      courseTitle: course.title,
      moduleTitle: courseModule?.title ?? nextLesson.moduleTitle,
      lessonId: nextLesson.id,
      lessonTitle: nextLesson.title,
      coursePercent: course.coursePercent,
      modulePercent: courseModule?.progressPercent ?? 0,
      deadlineDate: courseModule?.deadlineDate ?? null
    };
  }
  return null;
}

export async function getCourseForStudent(userId: string, courseId: string): Promise<StudentCourseLearningDetail> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: courseLearningInclude(userId)
  });
  if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
    throw new ApiError("forbidden", "Нет доступа к этому курсу", 403);
  }
  return buildCourseLearningDetail(enrollment);
}

export async function getModuleForStudent(userId: string, moduleId: string): Promise<StudentModuleLearningDetail> {
  const courseModule = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { courseId: true }
  });
  if (!courseModule) {
    throw new ApiError("not_found", "Модуль не найден", 404);
  }

  const course = await getCourseForStudent(userId, courseModule.courseId);
  const learningModule = course.modules.find((item) => item.id === moduleId);
  if (!learningModule) {
    throw new ApiError("not_found", "Модуль не найден", 404);
  }

  return {
    ...learningModule,
    courseId: course.id,
    courseTitle: course.title
  };
}

async function assertLessonAccess(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, module: { select: { courseId: true } } }
  });
  if (!lesson) {
    throw new ApiError("not_found", "Урок не найден", 404);
  }

  const course = await getCourseForStudent(userId, lesson.module.courseId);
  const orderedLessons = course.modules.flatMap((module) => module.lessons);
  const access = orderedLessons.find((item) => item.id === lessonId);
  if (!access) {
    throw new ApiError("not_found", "Урок не найден", 404);
  }
  if (access.locked) {
    throw new ApiError("forbidden", access.lockReason ?? "Урок пока недоступен", 403);
  }

  return { course, orderedLessons, access };
}

export async function getLessonForStudent(userId: string, lessonId: string): Promise<StudentLessonLearningDetail> {
  const { course, orderedLessons, access } = await assertLessonAccess(userId, lessonId);
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: lessonDetailInclude(userId)
  });
  if (!lesson) {
    throw new ApiError("not_found", "Урок не найден", 404);
  }

  const currentIndex = orderedLessons.findIndex((item) => item.id === lessonId);
  const prevLesson = currentIndex > 0 ? orderedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < orderedLessons.length - 1 ? orderedLessons[currentIndex + 1] : null;

  return {
    id: lesson.id,
    order: lesson.order,
    title: lesson.title,
    summary: lesson.summary,
    type: lesson.type,
    durationMinutes: lesson.durationMinutes,
    isRequired: lesson.isRequired,
    progressStatus: access.progressStatus,
    progressPercent: access.progressPercent ?? 0,
    content: asRecord(lesson.content),
    videoUrl: lesson.videoUrl,
    media: lesson.media.map((item) => ({
      id: item.id,
      type: item.type,
      url: item.url,
      filename: item.filename
    })),
    quizzes: lesson.quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      passThreshold: quiz.passThreshold,
      maxAttempts: quiz.maxAttempts,
      questionsCount: quiz.questions.length
    })),
    assignments: lesson.assignments.map<AssignmentSummary>((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      deadline: assignment.deadline?.toISOString() ?? null,
      maxAttempts: assignment.maxAttempts,
      submissionStatus: assignment.submissions[0]?.status ?? null
    })),
    moduleTitle: lesson.module.title,
    moduleId: lesson.moduleId,
    courseTitle: course.title,
    courseId: course.id,
    prevLesson: prevLesson ? { id: prevLesson.id, title: prevLesson.title } : null,
    nextLesson: nextLesson ? { id: nextLesson.id, title: nextLesson.title, locked: nextLesson.locked } : null,
    myQuestions: lesson.questions.map<LessonQuestionSummary>((question) => ({
      id: question.id,
      text: question.text,
      status: question.status === "answered" ? "answered" : "open",
      createdAt: question.createdAt.toISOString(),
      answer: question.answer,
      answeredAt: question.answeredAt?.toISOString() ?? null
    }))
  };
}

export async function askCuratorQuestion(userId: string, lessonId: string, text: string) {
  const lesson = await getLessonForStudent(userId, lessonId);
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: lesson.courseId } }
  });
  const curatorAssignment = enrollment?.cohortId
    ? await prisma.curatorAssignment.findUnique({
        where: { cohortId_studentId: { cohortId: enrollment.cohortId, studentId: userId } }
      })
    : null;

  const question = await prisma.lessonQuestion.create({
    data: {
      lessonId,
      studentId: userId,
      curatorId: curatorAssignment?.active ? curatorAssignment.curatorId : undefined,
      text: text.trim()
    }
  });

  await logAudit({
    actorId: userId,
    action: "lesson.question_created",
    entity: "lesson_question",
    entityId: question.id,
    metadata: { lessonId }
  });

  return {
    id: question.id,
    text: question.text,
    status: question.status,
    createdAt: question.createdAt.toISOString()
  };
}
