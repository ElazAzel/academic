import { RoleKey, CourseStatus, LessonType, QuestionType } from "@prisma/client";
import { getPrisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth/password";

const prisma = getPrisma();

const permissions = [
  "users:read",
  "users:write",
  "roles:manage",
  "courses:read",
  "courses:write",
  "lessons:write",
  "enrollments:write",
  "progress:write",
  "quizzes:write",
  "assignments:review",
  "certificates:issue",
  "invites:manage",
  "analytics:read",
  "audit:read",
  "settings:manage",
  "notifications:write",
  "reports:read"
];

const rolePermissions: Record<RoleKey, string[]> = {
  admin: permissions,
  instructor: ["courses:read", "courses:write", "lessons:write", "quizzes:write", "analytics:read", "reports:read"],
  student: ["courses:read", "progress:write"],
  curator: ["courses:read", "assignments:review", "progress:write", "notifications:write", "reports:read"],
  super_curator: ["courses:read", "assignments:review", "analytics:read", "notifications:write", "reports:read"],
  customer_observer: ["courses:read", "analytics:read", "reports:read"]
};

async function upsertUser(email: string, name: string, role: RoleKey) {
  const passwordHash = await hashPassword("Password123!");
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: {
      email,
      name,
      passwordHash,
      emailVerified: new Date(),
      consentLogs: {
        create: {
          type: "personal_data_processing",
          status: "ACCEPTED",
          version: "2026-05-07",
          acceptedAt: new Date()
        }
      }
    }
  });
  const dbRole = await prisma.role.findUniqueOrThrow({ where: { key: role } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: dbRole.id } },
    update: {},
    create: { userId: user.id, roleId: dbRole.id }
  });
  return user;
}

async function main() {
  for (const key of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, name: key }
    });
  }

  for (const roleKey of Object.values(RoleKey)) {
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      update: {},
      create: { key: roleKey, name: roleKey }
    });
    for (const permissionKey of rolePermissions[roleKey]) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key: permissionKey } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id }
      });
    }
  }

  const admin = await upsertUser("admin@academy.local", "Администратор", "admin");
  const instructor1 = await upsertUser("instructor1@academy.local", "Преподаватель", "instructor");
  const curator = await upsertUser("curator@academy.local", "Куратор", "curator");
  const superCurator = await upsertUser("supercurator@academy.local", "Супер-куратор", "super_curator");
  const observer = await upsertUser("observer@academy.local", "Заказчик / Наблюдатель", "customer_observer");

  const students = [];
  for (let index = 1; index <= 10; index += 1) {
    students.push(await upsertUser(`student${index}@academy.local`, `Слушатель ${index}`, "student"));
  }

  const client = await prisma.client.upsert({
    where: { id: "demo-client" },
    update: {},
    create: { id: "demo-client", name: "Demo Corporate Client", email: "client@example.com" }
  });

  const project = await prisma.project.upsert({
    where: { id: "demo-project" },
    update: {},
    create: {
      id: "demo-project",
      clientId: client.id,
      title: "AI Academy Tender Program",
      description: "Демонстрационный проект для поточного обучения"
    }
  });

  const courseTitles = [
    ["ai-strategy-fundamentals", "AI Strategy Fundamentals"],
    ["prompt-engineering-for-leaders", "Prompt Engineering for Leaders"],
    ["ai-governance-and-risk", "AI Governance and Risk"]
  ] as const;

  for (const [slug, title] of courseTitles) {
    const course = await prisma.course.upsert({
      where: { slug },
      update: { status: CourseStatus.PUBLISHED },
      create: {
        slug,
        title,
        description: "Практический курс закрытой академии с модулями, заданиями и цифровым следом.",
        goal: "Помочь руководителям внедрять AI безопасно и результативно.",
        durationHours: 18,
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date()
      }
    });
    await prisma.courseInstructor.upsert({
      where: { courseId_userId: { courseId: course.id, userId: instructor1.id } },
      update: {},
      create: { courseId: course.id, userId: instructor1.id }
    });

    for (let moduleOrder = 1; moduleOrder <= 2; moduleOrder += 1) {
      const courseModule = await prisma.module.upsert({
        where: { courseId_order: { courseId: course.id, order: moduleOrder } },
        update: {},
        create: {
          courseId: course.id,
          order: moduleOrder,
          title: `Модуль ${moduleOrder}: ${moduleOrder === 1 ? "Стратегия" : "Практика"}`,
          description: "Короткий модуль с уроками, тестом и заданием.",
          status: CourseStatus.PUBLISHED,
          recommendedDays: 7
        }
      });

      for (let lessonOrder = 1; lessonOrder <= 2; lessonOrder += 1) {
        const lesson = await prisma.lesson.upsert({
          where: { moduleId_order: { moduleId: courseModule.id, order: lessonOrder } },
          update: {},
          create: {
            moduleId: courseModule.id,
            order: lessonOrder,
            title: `Урок ${lessonOrder}`,
            summary: "Ключевые идеи и практическое применение.",
            type: lessonOrder === 2 ? LessonType.QUIZ : LessonType.VIDEO,
            content: { blocks: [{ type: "paragraph", text: "Материал урока на русском языке." }] },
            durationMinutes: 25
          }
        });

        if (lessonOrder === 2) {
          const quizTitle = `Тест: ${title}`;
          const quiz = await prisma.quiz.findFirst({
            where: { courseId: course.id, lessonId: lesson.id, title: quizTitle },
            include: { questions: true }
          });
          const existingQuiz = quiz
            ? await prisma.quiz.update({
                where: { id: quiz.id },
                data: { passThreshold: 80, maxAttempts: 3 },
                include: { questions: true }
              })
            : await prisma.quiz.create({
                data: {
                  courseId: course.id,
                  lessonId: lesson.id,
                  title: quizTitle,
                  passThreshold: 80,
                  maxAttempts: 3,
                  questions: {
                    create: [
                      {
                        type: QuestionType.SINGLE_CHOICE,
                        prompt: "Что является главным результатом курса?",
                        options: [
                          { id: "a", label: "Проверяемый образовательный результат" },
                          { id: "b", label: "Случайный набор видео" }
                        ],
                        correctAnswer: { value: "a" },
                        points: 1,
                        order: 1
                      }
                    ]
                  }
                },
                include: { questions: true }
              });

          if (existingQuiz.questions.length === 0) {
            await prisma.quizQuestion.create({
              data: {
                quizId: existingQuiz.id,
                type: QuestionType.SINGLE_CHOICE,
                prompt: "Что является главным результатом курса?",
                options: [
                  { id: "a", label: "Проверяемый образовательный результат" },
                  { id: "b", label: "Случайный набор видео" }
                ],
                correctAnswer: { value: "a" },
                points: 1,
                order: 1
              }
            });
          }

          const assignmentTitle = `Практическое задание: ${title}`;
          const assignment = await prisma.assignment.findFirst({
            where: {
              courseId: course.id,
              lessonId: lesson.id,
              title: assignmentTitle
            }
          });
          const assignmentData = {
            instructions: "Загрузите короткий план внедрения AI в вашей организации.",
            maxAttempts: 3
          };
          if (assignment) {
            await prisma.assignment.update({ where: { id: assignment.id }, data: assignmentData });
          } else {
            await prisma.assignment.create({
              data: {
                courseId: course.id,
                lessonId: lesson.id,
                title: assignmentTitle,
                ...assignmentData
              }
            });
          }
          if (existingQuiz.title.length === 0) {
            throw new Error("Seed quiz was not created");
          }
        }
      }
    }

    const cohortAName = `${title} — Поток A`;
    const cohortBName = `${title} — Поток B`;
    const cohortA =
      (await prisma.cohort.findFirst({ where: { courseId: course.id, projectId: project.id, name: cohortAName } })) ??
      (await prisma.cohort.create({
        data: { courseId: course.id, projectId: project.id, name: cohortAName }
      }));
    const cohortB =
      (await prisma.cohort.findFirst({ where: { courseId: course.id, projectId: project.id, name: cohortBName } })) ??
      (await prisma.cohort.create({
        data: { courseId: course.id, projectId: project.id, name: cohortBName }
      }));

    const cohorts = [cohortA, cohortB];
    for (const [index, student] of students.entries()) {
      const cohort = cohorts[index % cohorts.length];
      const enrollment = await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: student.id, courseId: course.id } },
        update: { cohortId: cohort.id },
        create: { userId: student.id, courseId: course.id, cohortId: cohort.id, status: "ACTIVE" }
      });
      await prisma.courseProgress.upsert({
        where: { userId_courseId: { userId: student.id, courseId: course.id } },
        update: {},
        create: {
          userId: student.id,
          courseId: course.id,
          enrollmentId: enrollment.id,
          status: "IN_PROGRESS",
          percent: index < 3 ? 45 : 0
        }
      });
      await prisma.curatorAssignment.upsert({
        where: { cohortId_studentId: { cohortId: cohort.id, studentId: student.id } },
        update: {},
        create: {
          cohortId: cohort.id,
          studentId: student.id,
          curatorId: curator.id,
          superCuratorId: superCurator.id
        }
      });
    }
  }

  await prisma.appSetting.upsert({
    where: { key: "academy.profile" },
    update: { value: { profile: "academy-ru-closed", defaultLocale: "ru" } },
    create: { key: "academy.profile", value: { profile: "academy-ru-closed", defaultLocale: "ru" } }
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "seed.completed",
      entity: "system",
      metadata: { courses: 3, students: 10, observer: observer.email }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
