import { NextResponse } from "next/server";
import { PrismaClient, RoleKey } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const passwordHash = await hashPassword("20122011Elaz");
    
    async function upsertUser(email: string, name: string, roleKey: RoleKey) {
      const user = await prisma.user.upsert({
        where: { email },
        update: { name, passwordHash },
        create: {
          email,
          name,
          passwordHash,
          emailVerified: new Date(),
        }
      });
      
      const role = await prisma.role.upsert({
        where: { key: roleKey },
        update: {},
        create: { key: roleKey, name: roleKey }
      });

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id }
      });
      return user;
    }

    // Создаем пользователей
    await upsertUser("admin@academy.local", "Администратор", "admin");
    const instructor = await upsertUser("instructor1@academy.local", "Преподаватель", "instructor");
    await upsertUser("curator@academy.local", "Куратор", "curator");
    await upsertUser("supercurator@academy.local", "Супер-куратор", "super_curator");
    await upsertUser("observer@academy.local", "Заказчик", "customer_observer");
    
    for (let i = 1; i <= 10; i++) {
      await upsertUser(`student${i}@academy.local`, `Слушатель ${i}`, "student");
    }

    // --- Создаем ДЕМО КУРС ---
    const courseSlug = "strategic-thinking-masterclass";
    const course = await prisma.course.upsert({
      where: { slug: courseSlug },
      update: {},
      create: {
        slug: courseSlug,
        title: "Стратегическое мышление и управление: Мастер-курс",
        description: "Полный курс по разработке и реализации бизнес-стратегии в условиях неопределенности.",
        status: "PUBLISHED",
        durationHours: 40,
        traversalMode: "sequential",
        instructors: {
          create: { userId: instructor.id }
        }
      }
    });

    // Модуль 1: Основы
    const module1 = await prisma.module.upsert({
      where: { courseId_order: { courseId: course.id, order: 1 } },
      update: {},
      create: {
        courseId: course.id,
        order: 1,
        title: "Введение в стратегический менеджмент",
        description: "Понятие стратегии, миссии и ценностей компании.",
        status: "PUBLISHED"
      }
    });

    // Урок 1.1: Видео
    await prisma.lesson.upsert({
      where: { moduleId_order: { moduleId: module1.id, order: 1 } },
      update: {},
      create: {
        moduleId: module1.id,
        order: 1,
        title: "Что такое стратегия?",
        type: "VIDEO",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        durationMinutes: 15,
        content: { text: "В этом видео мы разберем основные определения стратегии." }
      }
    });

    // Урок 1.2: Текст
    await prisma.lesson.upsert({
      where: { moduleId_order: { moduleId: module1.id, order: 2 } },
      update: {},
      create: {
        moduleId: module1.id,
        order: 2,
        title: "Эволюция стратегической мысли",
        type: "TEXT",
        content: { text: "Краткая история развития менеджмента от Тейлора до Портера." }
      }
    });

    // Модуль 2: Аналитика и Тесты
    const module2 = await prisma.module.upsert({
      where: { courseId_order: { courseId: course.id, order: 2 } },
      update: {},
      create: {
        courseId: course.id,
        order: 2,
        title: "Анализ и Проверка знаний",
        description: "Инструменты анализа и закрепление материала через тесты.",
        status: "PUBLISHED"
      }
    });

    // Урок 2.1: Тест
    const quizLesson = await prisma.lesson.upsert({
      where: { moduleId_order: { moduleId: module2.id, order: 1 } },
      update: {},
      create: {
        moduleId: module2.id,
        order: 1,
        title: "Тест по основам стратегии",
        type: "QUIZ",
        content: { text: "Проверьте свои знания первого модуля." }
      }
    });

    await prisma.quiz.upsert({
      where: { id: "demo-quiz-1" },
      update: {},
      create: {
        id: "demo-quiz-1",
        courseId: course.id,
        lessonId: quizLesson.id,
        title: "Итоговый тест модуля 1",
        passThreshold: 80,
        questions: {
          create: [
            {
              type: "SINGLE_CHOICE",
              prompt: "Кто является автором модели 5 конкурентных сил?",
              options: ["Майкл Портер", "Питер Друкер", "Филип Котлер", "Илон Маск"],
              correctAnswer: { index: 0 },
              points: 1,
              order: 1
            },
            {
              type: "TRUE_FALSE",
              prompt: "Стратегия и тактика — это одно и то же.",
              options: ["Верно", "Неверно"],
              correctAnswer: { index: 1 },
              points: 1,
              order: 2
            }
          ]
        }
      }
    });

    // Урок 2.2: Задание
    const assignmentLesson = await prisma.lesson.upsert({
      where: { moduleId_order: { moduleId: module2.id, order: 2 } },
      update: {},
      create: {
        moduleId: module2.id,
        order: 2,
        title: "Практическое задание: SWOT-анализ",
        type: "ASSIGNMENT",
        content: { text: "Выполните SWOT-анализ для вашей текущей компании." }
      }
    });

    await prisma.assignment.upsert({
      where: { id: "demo-assignment-1" },
      update: {},
      create: {
        id: "demo-assignment-1",
        courseId: course.id,
        lessonId: assignmentLesson.id,
        title: "SWOT-анализ вашей компании",
        instructions: "Составьте таблицу из 4 квадрантов и опишите не менее 3 факторов в каждом.",
        maxScore: 100
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: "Все аккаунты и ДЕМО КУРС успешно созданы!",
      course: courseSlug
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
