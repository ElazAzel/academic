import { getPrisma } from "../lib/prisma";
import { issueCertificate, generateCertificatePdf } from "../server/modules/certificates/service";
import { CourseStatus, LessonType } from "@prisma/client";
import fs from "fs";

async function main() {
  const prisma = getPrisma();

  console.log("Starting demo certificate provisioning...");

  // 1. Find admin user to act as actor
  const admin = await prisma.user.findUnique({
    where: { email: "admin@academy.local" },
  });
  if (!admin) {
    throw new Error("Admin user not found. Please run db:seed first.");
  }

  // 2. Find student1
  const student = await prisma.user.findUnique({
    where: { email: "student1@academy.local" },
  });
  if (!student) {
    throw new Error("Student1 user not found. Please run db:seed first.");
  }

  // 3. Find or create instructor
  let instructor = await prisma.user.findUnique({
    where: { email: "instructor1@academy.local" },
  });
  if (!instructor) {
    instructor = admin;
  }

  // 4. Create the course: "Стратегическое мышление и управление: Мастер-курс"
  const courseSlug = "strategic-thinking-masterclass";
  const course = await prisma.course.upsert({
    where: { slug: courseSlug },
    update: {
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      slug: courseSlug,
      title: "Стратегическое мышление и управление: Мастер-курс",
      description: "Полный мастер-курс по разработке и реализации бизнес-стратегии в условиях высокой неопределенности.",
      goal: "Сформировать у слушателей стратегическое видение и навыки эффективного управления ресурсами компании.",
      durationHours: 40,
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });

  console.log(`Course created: ${course.title} (Slug: ${course.slug})`);

  // Assign instructor to course if not already assigned
  const courseInst = await prisma.courseInstructor.findFirst({
    where: { courseId: course.id, userId: instructor.id },
  });
  if (!courseInst) {
    await prisma.courseInstructor.create({
      data: { courseId: course.id, userId: instructor.id },
    });
  }

  // 5. Clean up old modules and lessons for this course to prevent duplicates
  const existingModules = await prisma.module.findMany({
    where: { courseId: course.id },
    include: { lessons: true },
  });
  for (const m of existingModules) {
    for (const l of m.lessons) {
      await prisma.quiz.deleteMany({ where: { lessonId: l.id } });
      await prisma.assignment.deleteMany({ where: { lessonId: l.id } });
      await prisma.lessonProgress.deleteMany({ where: { lessonId: l.id } });
    }
    await prisma.lesson.deleteMany({ where: { moduleId: m.id } });
  }
  await prisma.module.deleteMany({ where: { courseId: course.id } });

  // 6. Create Module 1
  const module1 = await prisma.module.create({
    data: {
      courseId: course.id,
      order: 1,
      title: "Модуль 1: Анализ и разработка стратегии",
      description: "Основы стратегического видения, анализ внешней и внутренней среды организации.",
      status: CourseStatus.PUBLISHED,
    },
  });

  const lesson1 = await prisma.lesson.create({
    data: {
      moduleId: module1.id,
      order: 1,
      title: "Основы бизнес-стратегии",
      summary: "Основные понятия и этапы разработки бизнес-стратегии.",
      type: LessonType.TEXT,
      durationMinutes: 45,
      content: { blocks: [{ type: "paragraph", text: "Вводный урок о концепциях стратегического управления." }] },
    },
  });

  const lesson2 = await prisma.lesson.create({
    data: {
      moduleId: module1.id,
      order: 2,
      title: "Анализ внешней среды (PESTEL и 5 конкурентных сил Портера)",
      summary: "Анализ макроокружения и конкурентной структуры отрасли.",
      type: LessonType.VIDEO,
      durationMinutes: 60,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      content: { blocks: [{ type: "video", data: { videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } }] },
    },
  });

  // 7. Create Module 2
  const module2 = await prisma.module.create({
    data: {
      courseId: course.id,
      order: 2,
      title: "Модуль 2: Проверка знаний и сдача тестов",
      description: "Закрепление полученных знаний на практике через итоговый тест.",
      status: CourseStatus.PUBLISHED,
    },
  });

  const quizLesson = await prisma.lesson.create({
    data: {
      moduleId: module2.id,
      order: 1,
      title: "Итоговый тест по основам стратегии",
      summary: "Закрепляющий тест по материалу двух модулей.",
      type: LessonType.QUIZ,
      durationMinutes: 30,
      content: { blocks: [{ type: "quiz", data: { quizId: null } }] },
    },
  });

  // Create quiz for the lesson
  const quiz = await prisma.quiz.create({
    data: {
      courseId: course.id,
      lessonId: quizLesson.id,
      title: "Итоговый тест по стратегическому менеджменту",
      description: "Тест для получения сертификата.",
      passThreshold: 80,
      maxAttempts: 3,
      questions: {
        create: [
          {
            type: "SINGLE_CHOICE",
            prompt: "Кто сформулировал теорию 5 сил конкуренции?",
            options: ["Майкл Портер", "Питер Друкер", "Филип Котлер"],
            correctAnswer: { index: 0 },
            points: 1,
            order: 1,
          },
        ],
      },
    },
  });

  // Update quizLesson with the quiz ID
  await prisma.lesson.update({
    where: { id: quizLesson.id },
    data: { content: { blocks: [{ type: "quiz", data: { quizId: quiz.id } }] } },
  });

  console.log("Modules, lessons, and quiz successfully created!");

  // 8. Enroll student1 in the course
  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student.id, courseId: course.id } },
    update: { status: "ACTIVE" },
    create: {
      userId: student.id,
      courseId: course.id,
      status: "ACTIVE",
    },
  });

  console.log(`Student ${student.email} enrolled in the course.`);

  // 9. Complete student progress
  // Complete all lessons in the DB
  const allLessons = [lesson1, lesson2, quizLesson];
  for (const lesson of allLessons) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: student.id, lessonId: lesson.id } },
      update: { status: "COMPLETED", completedAt: new Date() },
      create: {
        userId: student.id,
        lessonId: lesson.id,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }

  // Create CourseProgress row with 100% completion
  await prisma.courseProgress.upsert({
    where: { userId_courseId: { userId: student.id, courseId: course.id } },
    update: {
      percent: 100,
      status: "COMPLETED",
      completedAt: new Date(),
    },
    create: {
      userId: student.id,
      courseId: course.id,
      enrollmentId: enrollment.id,
      percent: 100,
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  console.log("Student progress set to 100% completed for all lessons!");

  // Delete any existing certificate for this student and course to prevent unique constraint issues
  await prisma.certificate.deleteMany({
    where: { userId: student.id, courseId: course.id },
  });

  // 10. Issue the certificate!
  console.log("Issuing certificate...");
  const cert = await issueCertificate({ userId: student.id, courseId: course.id }, admin.id);
  console.log(`Certificate successfully issued! Number: ${cert.number}, Verification Code: ${cert.verificationCode}`);

  // 11. Generate and save the PDF file!
  console.log("Generating certificate PDF...");
  const pdfBytes = await generateCertificatePdf(cert.id);
  const pdfPath = "public/test-certificate.pdf";
  fs.writeFileSync(pdfPath, pdfBytes);
  console.log(`PDF successfully generated and saved to: ${pdfPath}`);

  console.log("\nAll actions successfully completed!");
  console.log(`Verification URL: ${cert.verificationUrl}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
