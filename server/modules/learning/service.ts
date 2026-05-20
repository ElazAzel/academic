import { EnrollmentStatus, Prisma, ProgressStatus, QuestionStatus } from "@prisma/client";
import { ApiError } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { TRAVERSAL_MODES } from "@/lib/constants";
import { logAudit } from "@/server/modules/audit/service";
import { createNotification } from "@/server/modules/notifications/service";
import type {
  AssignmentSummary,
  CompletionCta,
  ContentBlock,
  ContinueLearning,
  LessonLearningSummary,
  LessonVideo,
  LessonPlayerCard,
  ModuleLearningDetail,
  ModulePlayerDetail,
  StudentCourseLearningDetail,
  StudentCoursePlayerDetail,
  StudentLessonLearningDetail,
  StudentLessonPlayerDetail,
  StudentModuleLearningDetail,
  StudentProgress,
  StudentQuizDetail,
  StudentAssignmentDetail
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

const coursePlayerInclude = (userId: string) => ({
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
              progress: { where: { userId } },
              quizzes: { select: { id: true } },
              assignments: { select: { id: true } }
            }
          }
        }
      }
    }
  }
}) satisfies Prisma.EnrollmentInclude;

type CoursePlayerEnrollment = Prisma.EnrollmentGetPayload<{ include: ReturnType<typeof coursePlayerInclude> }>;

const lessonDetailInclude = (userId: string) => ({
  module: { include: { course: true } },
  media: true,
  quizzes: { include: { questions: { select: { id: true } } } },
  assignments: { include: { submissions: { where: { userId }, orderBy: { submittedAt: "desc" as const }, take: 1 } } },
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
    const locked = enrollment.course.traversalMode === TRAVERSAL_MODES.SEQUENTIAL && previousRequiredLessonOpen;
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
    traversalMode: course.traversalMode === TRAVERSAL_MODES.OPEN ? TRAVERSAL_MODES.OPEN : TRAVERSAL_MODES.SEQUENTIAL,
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
    const deadlineDate = courseModule?.deadlineDate ?? null;
    return {
      courseId: course.id,
      courseTitle: course.title,
      moduleTitle: courseModule?.title ?? nextLesson.moduleTitle,
      lessonId: nextLesson.id,
      lessonTitle: nextLesson.title,
      coursePercent: course.coursePercent,
      modulePercent: courseModule?.progressPercent ?? 0,
      deadlineDate,
      deadlineDaysLeft: deadlineDate
        ? Math.round((new Date(deadlineDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
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

function toCompletionCta(status: ProgressStatus, locked: boolean): CompletionCta {
  if (locked) return "locked";
  if (status === "COMPLETED") return "repeat";
  if (status === "IN_PROGRESS") return "continue";
  return "start";
}

function buildCoursePlayerDetail(enrollment: CoursePlayerEnrollment): StudentCoursePlayerDetail {
  const course = enrollment.course;
  const courseProgress = enrollment.courseProgress[0];
  const accessByLessonId = new Map<string, { locked: boolean; lockReason: string | null; status: ProgressStatus; progressPercent: number }>();

  let previousRequiredLessonOpen = false;
  const orderedLessons = course.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleOrder: m.order, moduleTitle: m.title }))
  );

  for (const lesson of orderedLessons) {
    const storedStatus = lesson.progress[0]?.status ?? ProgressStatus.NOT_STARTED;
    const locked = course.traversalMode === TRAVERSAL_MODES.SEQUENTIAL && previousRequiredLessonOpen;
    const status: ProgressStatus = locked ? ProgressStatus.BLOCKED : storedStatus;

    accessByLessonId.set(lesson.id, {
      locked,
      lockReason: locked ? "Сначала завершите предыдущие обязательные уроки." : null,
      status,
      progressPercent: locked ? 0 : lesson.progress[0]?.percent ?? 0
    });

    if (lesson.isRequired && storedStatus !== ProgressStatus.COMPLETED) {
      previousRequiredLessonOpen = true;
    }
  }

  const modules: ModulePlayerDetail[] = course.modules.map((module) => {
    const moduleProgress = module.progress[0];
    const lessons: LessonPlayerCard[] = module.lessons.map((lesson) => {
      const access = accessByLessonId.get(lesson.id)!;
      return {
        id: lesson.id,
        order: lesson.order,
        title: lesson.title,
        type: lesson.type,
        durationMinutes: lesson.durationMinutes,
        isRequired: lesson.isRequired,
        status: access.status,
        lockReason: access.lockReason ?? undefined,
        hasQuiz: lesson.quizzes.length > 0,
        hasAssignment: lesson.assignments.length > 0,
        completionCta: toCompletionCta(access.status, access.locked)
      };
    });

    const completedLessons = lessons.filter((l) => l.status === "COMPLETED").length;
    const computedPercent = lessons.length === 0 ? 0 : Math.round((completedLessons / lessons.length) * 100);
    const modulePercent = moduleProgress?.percent ?? computedPercent;

    const deadline = enrollment.cohortId
      ? module.deadlines.find((item) => item.cohortId === enrollment.cohortId)
      : null;

    return {
      id: module.id,
      order: module.order,
      title: module.title,
      progressPercent: modulePercent,
      lessons,
      deadline: deadline
        ? { date: deadline.dueAt.toISOString(), overdue: deadline.dueAt < new Date() }
        : undefined
    };
  });

  const allLessons = modules.flatMap((m) => m.lessons);
  const completed = allLessons.filter((l) => l.status === "COMPLETED").length;
  const total = allLessons.length;
  const percent = courseProgress?.percent ?? 0;
  const nextLesson = allLessons.find((l) => l.status !== "COMPLETED" && l.completionCta !== "locked");

  return {
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      coverUrl: course.coverUrl,
      durationHours: course.durationHours,
      status: course.status,
      traversalMode: course.traversalMode === TRAVERSAL_MODES.OPEN ? TRAVERSAL_MODES.OPEN : TRAVERSAL_MODES.SEQUENTIAL,
      modulesCount: modules.length,
      lessonsCount: total,
      instructors: course.instructors.map((entry) => ({
        id: entry.user.id,
        name: entry.user.name ?? entry.user.email,
        email: entry.user.email,
        image: entry.user.image
      }))
    },
    enrollment: enrollment.status,
    progress: { completed, total, percent },
    modules,
    nextLessonId: nextLesson?.id,
    curator: undefined,
    certificateEligible: percent >= course.completionThreshold,
    completionThreshold: course.completionThreshold
  };
}

export async function getStudentCoursePlayerDetail(userId: string, courseId: string): Promise<StudentCoursePlayerDetail> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: coursePlayerInclude(userId)
  });
  if (!enrollment || (enrollment.status !== "ACTIVE" && enrollment.status !== "COMPLETED")) {
    throw new ApiError("forbidden", "Нет доступа к этому курсу", 403);
  }

  const detail = buildCoursePlayerDetail(enrollment);

  // Fetch curator info
  if (enrollment.cohortId) {
    const assignment = await prisma.curatorAssignment.findUnique({
      where: { cohortId_studentId: { cohortId: enrollment.cohortId, studentId: userId } },
      include: { curator: { select: { id: true, name: true } } }
    });
    if (assignment?.active && assignment.curator) {
      const unansweredCount = await prisma.lessonQuestion.count({
        where: { studentId: userId, status: QuestionStatus.OPEN }
      });
      detail.curator = { name: assignment.curator.name ?? "Куратор", unansweredCount };
    }
  }

  return detail;
}

const VALID_BLOCK_TYPES = new Set(["video", "text", "file", "quiz", "assignment", "rating", "curator_question", "completion"]);

function parseContentBlock(block: Record<string, unknown>, legacyFallback: string): ContentBlock {
  const type = VALID_BLOCK_TYPES.has(block.type as string) ? (block.type as ContentBlock["type"]) : "text";
  const data = block.data as Record<string, unknown> ?? {};

  switch (type) {
    case "video": {
      const videoData = data.video as Record<string, unknown> | undefined;
      const hasStructuredVideo = videoData && typeof videoData.provider === "string" && typeof videoData.providerVideoId === "string";
      if (hasStructuredVideo) {
        return { id: (block.id as string) ?? crypto.randomUUID(), type: "video", data: { video: videoData as unknown as LessonVideo, title: data.title as string } };
      }
      return { id: (block.id as string) ?? crypto.randomUUID(), type: "video", data: { videoUrl: (data.videoUrl as string) ?? legacyFallback, title: data.title as string, duration: data.duration as number } };
    }
    case "text":
      return { id: (block.id as string) ?? crypto.randomUUID(), type: "text", data: { html: (data.html as string) ?? "" } };
    case "file":
      return { id: (block.id as string) ?? crypto.randomUUID(), type: "file", data: { url: (data.url as string) ?? "", filename: data.filename as string, fileType: data.fileType as string } };
    case "quiz":
      return { id: (block.id as string) ?? crypto.randomUUID(), type: "quiz", data: { quizId: (data.quizId as string) ?? "" } };
    case "assignment":
      return { id: (block.id as string) ?? crypto.randomUUID(), type: "assignment", data: { assignmentId: (data.assignmentId as string) ?? "" } };
    case "rating":
      return { id: (block.id as string) ?? crypto.randomUUID(), type: "rating", data: { lessonId: (data.lessonId as string) ?? "" } };
    case "curator_question":
      return { id: (block.id as string) ?? crypto.randomUUID(), type: "curator_question", data: { lessonId: (data.lessonId as string) ?? "" } };
    case "completion":
      return { id: (block.id as string) ?? crypto.randomUUID(), type: "completion", data: { label: data.label as string | undefined } };
    default:
      return { id: (block.id as string) ?? crypto.randomUUID(), type: "text", data: { html: "" } };
  }
}

export function parseContentBlocks(content: Record<string, unknown>): ContentBlock[] {
  if (content && Array.isArray(content.blocks)) {
    return (content.blocks as Array<Record<string, unknown>>).map((block) => parseContentBlock(block, ""));
  }
  // Legacy format: single text block
  const text = content && typeof content === "object" && "text" in content
    ? (content as { text: unknown }).text
    : null;
  if (typeof text === "string") {
    return [{ id: crypto.randomUUID(), type: "text", data: { html: text } }];
  }
  return [];
}

export async function getStudentLessonPlayerDetail(userId: string, lessonId: string): Promise<StudentLessonPlayerDetail> {
  // 1. Быстро получаем courseId из урока (minimal query)
  const lessonMeta = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, module: { select: { courseId: true } } },
  });
  if (!lessonMeta) {
    throw new ApiError("not_found", "Урок не найден", 404);
  }
  const courseId = lessonMeta.module.courseId;

  // 2. Запускаем все независимые запросы параллельно
  const [lesson, courseDetail, curatorAssignment] = await Promise.all([
    getLessonForStudent(userId, lessonId),
    getStudentCoursePlayerDetail(userId, courseId),
    prisma.curatorAssignment.findFirst({
      where: { studentId: userId, active: true },
      include: { curator: { select: { id: true, name: true } } },
    }),
  ]);

  const blocks = parseContentBlocks(lesson.content);

  const [quizDetails, assignmentDetails] = await Promise.all([
    Promise.all(lesson.quizzes.map((q) => getQuizForStudent(userId, q.id))),
    Promise.all(lesson.assignments.map((a) => getAssignmentForStudent(userId, a.id))),
  ]);

  return {
    lesson,
    blocks,
    courseTree: courseDetail.modules,
    quizDetails,
    assignmentDetails,
    curatorId: curatorAssignment?.curator.id,
    curatorName: curatorAssignment?.curator.name ?? undefined,
  };
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

  if (curatorAssignment?.active) {
    await createNotification({
      userId: curatorAssignment.curatorId,
      event: "question_received",
      data: { studentId: userId, lessonId, questionId: question.id }
    }).catch((e) => console.error("Failed to notify curator:", e));
  }

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

export async function getQuizForStudent(userId: string, quizId: string): Promise<StudentQuizDetail> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { order: "asc" } },
      course: { select: { id: true, title: true } },
      lesson: { select: { id: true } }
    }
  });

  if (!quiz) {
    throw new ApiError("not_found", "Тест не найден", 404);
  }

  // Check access via lesson
  if (quiz.lessonId) {
    await assertLessonAccess(userId, quiz.lessonId);
  }

  return {
    id: quiz.id,
    title: quiz.title,
    passThreshold: quiz.passThreshold,
    maxAttempts: quiz.maxAttempts,
    questionsCount: quiz.questions.length,
    courseId: quiz.courseId ?? "",
    courseTitle: quiz.course?.title ?? "",
    lessonId: quiz.lessonId ?? "",
    questions: quiz.questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.prompt,
      options: Array.isArray(q.options)
        ? (q.options as Array<{ id?: string; label?: string }>).map((o) => o.label ?? o.id ?? String(o))
        : []
    }))
  };
}

export async function getAssignmentForStudent(userId: string, assignmentId: string): Promise<StudentAssignmentDetail> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      course: { select: { id: true, title: true } },
      lesson: { select: { id: true } },
      submissions: {
        where: { userId },
        orderBy: { submittedAt: "desc" },
        take: 1
      }
    }
  });

  if (!assignment) {
    throw new ApiError("not_found", "Задание не найдено", 404);
  }

  // Check access via lesson
  if (assignment.lessonId) {
    await assertLessonAccess(userId, assignment.lessonId);
  }

  const submission = assignment.submissions[0];

  return {
    id: assignment.id,
    title: assignment.title,
    deadline: assignment.deadline?.toISOString() ?? null,
    maxAttempts: assignment.maxAttempts,
    submissionStatus: submission?.status ?? null,
    courseId: assignment.courseId ?? "",
    courseTitle: assignment.course?.title ?? "",
    lessonId: assignment.lessonId ?? "",
    instructions: assignment.instructions,
    submission: submission ? {
      id: submission.id,
      answerText: submission.answerText,
      fileUrl: submission.fileUrl,
      status: submission.status,
      feedback: submission.feedback,
      score: submission.score,
      submittedAt: submission.submittedAt.toISOString()
    } : null
  };
}
