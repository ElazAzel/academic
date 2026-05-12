import { PrismaClient, CourseStatus, LessonType } from "@prisma/client";

const prisma = new PrismaClient();

const COURSE_SLUG = "ai-digital-literacy-gov";

async function main() {
  // Find instructor
  const instructor = await prisma.user.findUnique({
    where: { email: "instructor1@academy.local" },
  });

  if (!instructor) {
    throw new Error("instructor1@academy.local not found. Run npm run users:create first.");
  }

  // Upsert course
  const course = await prisma.course.upsert({
    where: { slug: COURSE_SLUG },
    update: {},
    create: {
      slug: COURSE_SLUG,
      title: "Цифровая грамотность и ИИ для государственных служащих",
      description:
        "Комплексная программа обучения по применению искусственного интеллекта и цифровых инструментов в государственном секторе. 48 академических часов: основы ИИ/ML, аналитика данных, генеративный ИИ, автоматизация процессов, no-code разработка и управление рисками.",
      goal: "Научить госслужащих эффективно применять ИИ-инструменты для оптимизации рабочих процессов, анализа данных, автоматизации обращений граждан и принятия управленческих решений.",
      durationHours: 48,
      traversalMode: "sequential",
      completionThreshold: 80,
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });

  // Assign instructor
  await prisma.courseInstructor.upsert({
    where: { courseId_userId: { courseId: course.id, userId: instructor.id } },
    update: {},
    create: { courseId: course.id, userId: instructor.id },
  });

  console.log(`Course upserted: ${course.title} (${course.id})`);

  // Delete existing modules/lessons for clean rebuild
  const existingModules = await prisma.module.findMany({
    where: { courseId: course.id },
    include: { lessons: true },
  });
  for (const mod of existingModules) {
    for (const lesson of mod.lessons) {
      await prisma.quiz.deleteMany({ where: { lessonId: lesson.id } });
      await prisma.assignment.deleteMany({ where: { lessonId: lesson.id } });
    }
    await prisma.lesson.deleteMany({ where: { moduleId: mod.id } });
    await prisma.module.delete({ where: { id: mod.id } });
  }

  const modulesData = [
    {
      title: "Неделя 1: Основы ИИ/ML и цифровой грамотности",
      description: "Введение в искусственный интеллект, машинное обучение и большие языковые модели. Сферы применения в госсекторе.",
      order: 1,
      recommendedDays: 7,
      lessons: [
        {
          title: "Введение в ИИ, ML, LLM и генеративный ИИ",
          type: LessonType.VIDEO,
          durationMinutes: 90,
          summary: "Базовые понятия: данные, модели, метки, обучение, прогноз. Отличие предиктивного и генеративного ИИ.",
          blocks: [
            { type: "video", data: { videoUrl: "https://www.youtube.com/embed/placeholder-week1-intro" } },
            { type: "text", data: { html: "<p>Искусственный интеллект (ИИ) — способность машин имитировать человеческий интеллект: обучаться, рассуждать, принимать решения. ML — подраздел ИИ, где системы обучаются на данных без явного программирования правил.</p>" } },
            { type: "text", data: { html: "<p><strong>LLM (Large Language Models)</strong> — большие языковые модели, обученные на огромных корпусах текста. Примеры: Gemini, GPT-4, Claude. <strong>Генеративный ИИ</strong> создаёт новый контент: текст, изображения, код.</p>" } },
          ],
        },
        {
          title: "Сферы применения ИИ в госсекторе",
          type: LessonType.TEXT,
          durationMinutes: 60,
          summary: "Казахстанский и мировой опыт: обработка обращений, анализ бюджетных расходов, цифровые ID.",
          blocks: [
            { type: "text", data: { html: "<p>ИИ уже применяется в государственном секторе по всему миру:</p><ul><li><strong>Estonia Bürokratt</strong> — ИИ-ассистент для госслужащих и граждан</li><li><strong>HMRC (UK)</strong> — анализ налоговых аномалий</li><li><strong>Egov AI (Казахстан)</strong> — автоматизация ответов на портале госуслуг</li></ul>" } },
            { type: "text", data: { html: "<p>В Казахстане приоритетные направления: цифровые ID, мониторинг бюджетных расходов, контрольно-надзорная деятельность, обработка обращений граждан.</p>" } },
          ],
        },
        {
          title: "Кейс: HMRC/IRS и обработка обращений",
          type: LessonType.MIXED,
          durationMinutes: 90,
          summary: "Разбор международных кейсов использования ИИ для анализа данных и обработки запросов граждан.",
          blocks: [
            { type: "text", data: { html: "<h3>Кейс HMRC (Великобритания)</h3><p>Система анализирует налоговые декларации и выявляет аномалии с помощью ML. Точность выявления мошенничества выросла на 25%, время проверки сократилось с 30 до 5 дней.</p>" } },
            { type: "text", data: { html: "<h3>Кейс Estonia Bürokratt</h3><p>ИИ-ассистент обрабатывает ~60% запросов граждан без участия человека. Интегрирован с 20+ госуслугами.</p>" } },
            { type: "quiz", data: { quizId: null } },
          ],
        },
      ],
      quiz: {
        title: "Тест: Основы ИИ/ML",
        description: "Проверка понимания базовых концепций ИИ, ML и LLM.",
        passThreshold: 70,
        maxAttempts: 3,
        questions: [
          { type: "MULTIPLE_CHOICE", prompt: "Что такое ML?", options: ["Язык программирования", "Подраздел ИИ, где системы обучаются на данных", "Тип базы данных", "Протокол сети"], correctAnswer: { index: 1 }, points: 1 },
          { type: "MULTIPLE_CHOICE", prompt: "Какая модель относится к генеративному ИИ?", options: ["Линейная регрессия", "GPT-4", "K-means", "SVM"], correctAnswer: { index: 1 }, points: 1 },
          { type: "TRUE_FALSE", prompt: "LLM обучаются исключительно на структурированных таблицах.", options: ["Верно", "Неверно"], correctAnswer: { index: 1 }, points: 1 },
        ],
      },
      assignment: {
        title: "Задание: Описать повторяющийся процесс",
        instructions: "Опишите один повторяющийся процесс в вашем подразделении (например, приём и обработка обращений). Выделите рутинные шаги. Сопоставьте с 1–2 иностранными кейсами (HMRC, Estonia Bürokratt, Boti) и ответьте: «Что можно взять здесь, что нет и почему?».",
        maxAttempts: 3,
        maxScore: 100,
      },
    },
    {
      title: "Недели 2–3: Аналитика данных и работа с гос-данными",
      description: "Инструменты аналитики, безопасная работа с данными, кейс AI Data Hub Kazakhstan.",
      order: 2,
      recommendedDays: 14,
      lessons: [
        {
          title: "Инструменты: Gemini, Excel Copilot, Power BI",
          type: LessonType.VIDEO,
          durationMinutes: 90,
          summary: "Обзор инструментов для анализа данных: Gemini 3 Pro, Excel & Power BI Copilot, Julius AI, Google Vertex AI.",
          blocks: [
            { type: "video", data: { videoUrl: "https://www.youtube.com/embed/placeholder-week2-tools" } },
            { type: "text", data: { html: "<p><strong>Excel Copilot</strong> позволяет генерировать сложные формулы, анализировать тренды и создавать визуализации через естественный язык. <strong>Power BI Copilot</strong> автоматически строит отчёты и дашборды.</p>" } },
            { type: "text", data: { html: "<p><strong>Julius AI</strong> — анализирует датасеты и отвечает на вопросы на естественном языке. <strong>Google Vertex AI</strong> — облачная платформа для обучения и развёртывания ML-моделей.</p>" } },
          ],
        },
        {
          title: "Безопасная работа с данными",
          type: LessonType.TEXT,
          durationMinutes: 60,
          summary: "Правила анонимизации данных перед отправкой в ИИ. Работа с закрытой информацией.",
          blocks: [
            { type: "text", data: { html: "<h3>Правила безопасности</h3><ul><li>Анонимизировать персональные данные (ФИО, ИИН, адреса) перед загрузкой в публичные ИИ-сервисы</li><li>Использовать корпоративные версии инструментов с data residency</li><li>Проверять политику конфиденциальности провайдера</li><li>Не загружать коммерческую тайну и гостайну в открытые LLM</li></ul>" } },
            { type: "text", data: { html: "<p><strong>Методы анонимизации:</strong> маскирование (замена на ***), псевдонимизация (замена на ID), обобщение (агрегирование по группам), шумовое наложение.</p>" } },
          ],
        },
        {
          title: "Кейс: AI Data Hub Kazakhstan",
          type: LessonType.MIXED,
          durationMinutes: 120,
          summary: "Разбор системы объединения госданных в единую аналитическую платформу.",
          blocks: [
            { type: "text", data: { html: "<h3>AI Data Hub Kazakhstan</h3><p>Единая аналитическая платформа, объединяющая данные из различных госорганов. Позволяет строить сквозную аналитику по бюджетным расходам, социальным выплатам, лицензиям и разрешениям.</p>" } },
            { type: "text", data: { html: "<p><strong>Результаты:</strong> сокращение времени подготовки аналитических отчётов с 2 недель до 2 дней. Выявление аномалий в социальных выплатах на 15% раньше.</p>" } },
            { type: "quiz", data: { quizId: null } },
          ],
        },
      ],
      quiz: {
        title: "Тест: Аналитика данных",
        description: "Проверка знаний по инструментам аналитики и безопасности данных.",
        passThreshold: 70,
        maxAttempts: 3,
        questions: [
          { type: "MULTIPLE_CHOICE", prompt: "Какой инструмент позволяет анализировать датасеты на естественном языке?", options: ["PowerPoint", "Julius AI", "Photoshop", "AutoCAD"], correctAnswer: { index: 1 }, points: 1 },
          { type: "MULTIPLE_CHOICE", prompt: "Что делать с персональными данными перед загрузкой в публичный ИИ?", options: ["Ничего", "Анонимизировать", "Удалить все строки", "Зашифровать паролем"], correctAnswer: { index: 1 }, points: 1 },
          { type: "TRUE_FALSE", prompt: "Google Vertex AI — это только текстовый чат-бот.", options: ["Верно", "Неверно"], correctAnswer: { index: 1 }, points: 1 },
        ],
      },
      assignment: {
        title: "Задание: Создать таблицу псевдо-данных",
        instructions: "Создайте таблицу с псевдо-данными по обращениям граждан за месяц (столбцы: тип, регион, срок, ответственный отдел, статус). Загрузите в ИИ (Gemini) и с помощью промптов выявьте: «В какие дни недели нагрузка выше на 20%?» и «Какие 3 темы чаще всего вызывают негатив?».",
        maxAttempts: 3,
        maxScore: 100,
      },
    },
    {
      title: "Неделя 4: Генеративный ИИ и ИИ-ассистенты",
      description: "Промпт-инжиниринг, генерация текстов и визуального контента, этические аспекты.",
      order: 3,
      recommendedDays: 7,
      lessons: [
        {
          title: "Промпт-инжиниринг",
          type: LessonType.VIDEO,
          durationMinutes: 90,
          summary: "Как формулировать запросы к LLM для получения качественных результатов.",
          blocks: [
            { type: "video", data: { videoUrl: "https://www.youtube.com/embed/placeholder-week4-prompt" } },
            { type: "text", data: { html: "<p><strong>Структура хорошего промпта:</strong> роль + контекст + задача + формат + ограничения. Пример: «Ты — юрист госучреждения. Напиши проект ответа на обращение гражданина по вопросу регистрации бизнеса. Формат: официальное письмо. Длина: 200-300 слов.»</p>" } },
            { type: "text", data: { html: "<p><strong>Техники:</strong> Chain-of-Thought (пошаговое рассуждение), Few-shot (примеры в запросе), Self-consistency (несколько вариантов и выбор лучшего).</p>" } },
          ],
        },
        {
          title: "Генерация визуального контента",
          type: LessonType.TEXT,
          durationMinutes: 60,
          summary: "ИИ-инструменты для создания изображений, схем, инфографики и презентаций.",
          blocks: [
            { type: "text", data: { html: "<p><strong>Инструменты:</strong></p><ul><li><strong>Leonardo AI, Midjourney</strong> — фотореалистичные изображения и иллюстрации</li><li><strong>Gamma</strong> — генерация презентаций</li><li><strong>Notebook LM</strong> — создание подкастов и резюме из документов</li><li><strong>Veo, Kling</strong> — генерация видео</li></ul>" } },
            { type: "text", data: { html: "<p><strong>Применение в госсекторе:</strong> создание информационных материалов для граждан, визуализация процессов получения услуг, инфографика для отчётов.</p>" } },
          ],
        },
        {
          title: "Этические и правовые аспекты",
          type: LessonType.TEXT,
          durationMinutes: 60,
          summary: "Персональные данные, факт-чекинг, human-in-the-loop, ответственность за ИИ-решения.",
          blocks: [
            { type: "text", data: { html: "<h3>Ключевые принципы</h3><ul><li><strong>Human-in-the-loop:</strong> ИИ-рекомендации всегда проверяет человек</li><li><strong>Факт-чекинг:</strong> LLM могут галлюцинировать — проверяйте факты</li><li><strong>Прозрачность:</strong> граждане должны знать, что общаются с ИИ</li><li><strong>Ответственность:</strong> человек несёт ответственность за решение, принятое на основе ИИ</li></ul>" } },
            { type: "quiz", data: { quizId: null } },
          ],
        },
      ],
      quiz: {
        title: "Тест: Генеративный ИИ",
        description: "Проверка знаний по промпт-инжинирингу и этике ИИ.",
        passThreshold: 70,
        maxAttempts: 3,
        questions: [
          { type: "MULTIPLE_CHOICE", prompt: "Что такое Chain-of-Thought?", options: ["Нейросеть", "Пошаговое рассуждение в промпте", "Вид данных", "Язык программирования"], correctAnswer: { index: 1 }, points: 1 },
          { type: "MULTIPLE_CHOICE", prompt: "Какой принцип требует проверки ИИ-рекомендаций человеком?", options: ["Zero-trust", "Human-in-the-loop", "Agile", "DevOps"], correctAnswer: { index: 1 }, points: 1 },
          { type: "TRUE_FALSE", prompt: "LLM всегда генерируют только проверенные факты.", options: ["Верно", "Неверно"], correctAnswer: { index: 1 }, points: 1 },
        ],
      },
      assignment: {
        title: "Задание: Сгенерировать ответы-черновики",
        instructions: "Подготовьте 3-4 типовых вопроса/обращений граждан (например, по налогам, документам, жилищным вопросам). Сгенерируйте по каждому короткий ответ-черновик с помощью ИИ, затем отредактируйте до «официального» стиля.",
        maxAttempts: 3,
        maxScore: 100,
      },
    },
    {
      title: "Недели 5–6: Автоматизация рабочих процессов",
      description: "Инструмент n8n, AI Agent Node, интеграция с госканалами, ИИ-маршрутинг обращений.",
      order: 4,
      recommendedDays: 14,
      lessons: [
        {
          title: "Инструмент n8n и AI Agent Node",
          type: LessonType.VIDEO,
          durationMinutes: 120,
          summary: "Архитектура n8n, создание умных рабочих процессов с ИИ-агентами.",
          blocks: [
            { type: "video", data: { videoUrl: "https://www.youtube.com/embed/placeholder-week5-n8n" } },
            { type: "text", data: { html: "<p><strong>n8n</strong> — open-source платформа для автоматизации рабочих процессов. Позволяет соединять различные сервисы (Telegram, email, Google Sheets, ИИ API) в визуальном редакторе без кода.</p>" } },
            { type: "text", data: { html: "<p><strong>AI Agent Node</strong> позволяет встроить LLM в workflow: классификация писем, генерация ответов, извлечение данных, принятие решений на основе правил.</p>" } },
          ],
        },
        {
          title: "Интеграция с госканалами",
          type: LessonType.TEXT,
          durationMinutes: 90,
          summary: "Telegram-боты, email (IMAP), Google Таблицы. ИИ-маршрутинг обращений к нужному отделу.",
          blocks: [
            { type: "text", data: { html: "<p><strong>ИИ-маршрутинг обращений:</strong> входящее письмо или сообщение анализируется LLM, который определяет категорию и направляет нужному отделу автоматически.</p>" } },
            { type: "text", data: { html: "<p><strong>Пример workflow:</strong></p><ol><li>Письмо от гражданина приходит на общий ящик</li><li>n8n извлекает текст и отправляет в LLM для классификации</li><li>LLM определяет тему (налоги, соцзащита, ЖКХ)</li><li>n8n создаёт тикет в нужном отделе и отправляет автоответ</li></ol>" } },
          ],
        },
        {
          title: "Кейс: Hospital Hero AI",
          type: LessonType.MIXED,
          durationMinutes: 60,
          summary: "Автоматизация маршрутов пациентов и обработки обращений.",
          blocks: [
            { type: "text", data: { html: "<h3>Hospital Hero AI</h3><p>Система автоматически маршрутизирует пациентов: анализирует симптомы, назначает нужного специалиста, бронирует время, отправляет напоминания. Сокращение времени ожидания на 40%.</p>" } },
            { type: "text", data: { html: "<p><strong>Аналогия для госсектора:</strong> автоматическая маршрутизация обращений граждан к нужным специалистам и отделам без участия оператора.</p>" } },
            { type: "quiz", data: { quizId: null } },
          ],
        },
      ],
      quiz: {
        title: "Тест: Автоматизация процессов",
        description: "Проверка знаний по n8n и ИИ-маршрутингу.",
        passThreshold: 70,
        maxAttempts: 3,
        questions: [
          { type: "MULTIPLE_CHOICE", prompt: "Что такое n8n?", options: ["База данных", "Платформа автоматизации workflow", "Язык программирования", "Вид ИИ-модели"], correctAnswer: { index: 1 }, points: 1 },
          { type: "MULTIPLE_CHOICE", prompt: "Что делает AI Agent Node в n8n?", options: ["Хранит файлы", "Встраивает LLM в workflow", "Создаёт таблицы", "Отправляет SMS"], correctAnswer: { index: 1 }, points: 1 },
          { type: "TRUE_FALSE", prompt: "ИИ-маршрутинг позволяет автоматически направлять обращения нужному отделу.", options: ["Верно", "Неверно"], correctAnswer: { index: 0 }, points: 1 },
        ],
      },
      assignment: {
        title: "Задание: Создать автоматизацию n8n",
        instructions: "Выберите один процесс в своём подразделении и опишите его по шагам (flow-диаграмма или список). Пометьте шаги, которые можно автоматизировать. Сформулируйте 1–2 предложения для руководства: какие процессы можно автоматизировать в пилоте и почему.",
        maxAttempts: 3,
        maxScore: 100,
      },
    },
    {
      title: "Неделя 7: No-code разработка и управление рисками",
      description: "Создание приложений без кода, этические риски, минимизация.",
      order: 5,
      recommendedDays: 7,
      lessons: [
        {
          title: "Google Antigravity, Lovable, Claude Code",
          type: LessonType.VIDEO,
          durationMinutes: 90,
          summary: "Инструменты для создания сайтов и приложений без знаний программирования.",
          blocks: [
            { type: "video", data: { videoUrl: "https://www.youtube.com/embed/placeholder-week7-nocode" } },
            { type: "text", data: { html: "<p><strong>Google Antigravity</strong> — визуальный конструктор веб-приложений. <strong>Lovable</strong> — AI-ассистент для генерации кода и UI. <strong>Claude Code</strong> — помощник для работы с кодом и документацией.</p>" } },
            { type: "text", data: { html: "<p>Эти инструменты позволяют госслужащим создавать внутренние сервисы: трекеры заявок, калькуляторы, панели мониторинга — без привлечения IT-отдела.</p>" } },
          ],
        },
        {
          title: "Риски и ограничения ИИ",
          type: LessonType.TEXT,
          durationMinutes: 60,
          summary: "Смещение, дискриминация, прозрачность, доверие. Как минимизировать риски.",
          blocks: [
            { type: "text", data: { html: "<h3>Основные риски</h3><ul><li><strong>Смещение (bias):</strong> модель может усиливать существующие предрассудки в данных</li><li><strong>Галлюцинации:</strong> генерация ложной информации</li><li><strong>Прозрачность:</strong> сложно объяснить, почему ИИ принял решение</li><li><strong>Зависимость:</strong> потеря компетенций при чрезмерной автоматизации</li></ul>" } },
            { type: "text", data: { html: "<h3>Меры минимизации</h3><ul><li>Регулярный аудит моделей на bias</li><li>Human-in-the-loop для критических решений</li><li>Прозрачность: документирование логики ИИ</li><li>Резервирование: сохранение ручного процесса как fallback</li></ul>" } },
            { type: "quiz", data: { quizId: null } },
          ],
        },
      ],
      quiz: {
        title: "Тест: No-code и риски ИИ",
        description: "Проверка знаний по no-code инструментам и управлению рисками.",
        passThreshold: 70,
        maxAttempts: 3,
        questions: [
          { type: "MULTIPLE_CHOICE", prompt: "Какой инструмент позволяет создавать приложения без кода?", options: ["Photoshop", "Lovable", "AutoCAD", "Blender"], correctAnswer: { index: 1 }, points: 1 },
          { type: "MULTIPLE_CHOICE", prompt: "Что такое bias в контексте ИИ?", options: ["Скорость работы", "Смещение/предвзятость модели", "Тип данных", "Язык программирования"], correctAnswer: { index: 1 }, points: 1 },
          { type: "TRUE_FALSE", prompt: "Human-in-the-loop означает, что человек всегда проверяет ИИ-рекомендации.", options: ["Верно", "Неверно"], correctAnswer: { index: 0 }, points: 1 },
        ],
      },
      assignment: {
        title: "Задание: Создать внутренний сервис",
        instructions: "Создайте внутренний сервис для отдела (например, «Трекер заявок на ремонт техники» или «Калькулятор социальных пособий») с помощью no-code инструмента. Опишите функционал, скриншоты и инструкцию по использованию.",
        maxAttempts: 3,
        maxScore: 100,
      },
    },
    {
      title: "Неделя 8: Финальный проект",
      description: "Разработка плана внедрения ИИ-решения в своём подразделении. Защита проекта.",
      order: 6,
      recommendedDays: 7,
      lessons: [
        {
          title: "Структура финального проекта",
          type: LessonType.TEXT,
          durationMinutes: 60,
          summary: "Как подготовить план внедрения ИИ-решения: описание задачи, выбор направления, концепция, логика, план, оценка.",
          blocks: [
            { type: "text", data: { html: "<h3>Структура проекта</h3><ol><li><strong>Описание задачи:</strong> текущий процесс, нагрузка, проблемы</li><li><strong>Выбор направления:</strong> генеративный ИИ / автоматизация / аналитика / no-code</li><li><strong>Концепция:</strong> тип системы, необходимые данные, форматы</li><li><strong>Логика:</strong> что делает ИИ, что остаётся за человеком</li><li><strong>План внедрения:</strong> 3–4 этапа с сроками</li><li><strong>Оценка:</strong> KPI, риски, способы минимизации</li></ol>" } },
            { type: "text", data: { html: "<p><strong>Критерии оценки:</strong> реалистичность, обоснованность выбора инструментов, учёт рисков, ясность плана, качество презентации.</p>" } },
          ],
        },
        {
          title: "Как подготовить презентацию",
          type: LessonType.TEXT,
          durationMinutes: 60,
          summary: "Советы по подготовке презентации финального проекта. Формат 10-15 слайдов.",
          blocks: [
            { type: "text", data: { html: "<h3>Рекомендуемая структура слайдов</h3><ol><li>Титул: название проекта, автор, подразделение</li><li>Проблема: текущая ситуация и боли</li><li>Решение: концепция ИИ-системы</li><li>Архитектура: данные → ИИ → результат</li><li>План: этапы и сроки (3–4 месяца)</li><li>Ресурсы: бюджет, люди, технологии</li><li>KPI: ожидаемый эффект (время, качество, стоимость)</li><li>Риски: 3 главных риска и меры</li><li>Следующие шаги: пилот, тестирование, масштабирование</li><li>Контакты и вопросы</li></ol>" } },
            { type: "quiz", data: { quizId: null } },
          ],
        },
      ],
      quiz: {
        title: "Тест: Финальный проект",
        description: "Проверка понимания структуры и критериев финального проекта.",
        passThreshold: 70,
        maxAttempts: 3,
        questions: [
          { type: "MULTIPLE_CHOICE", prompt: "Сколько этапов рекомендуется в плане внедрения?", options: ["1-2", "3-4", "10-15", "50"], correctAnswer: { index: 1 }, points: 1 },
          { type: "MULTIPLE_CHOICE", prompt: "Какой раздел обязателен в структуре проекта?", options: ["История компании", "Оценка рисков", "Биография автора", "Список оборудования"], correctAnswer: { index: 1 }, points: 1 },
          { type: "TRUE_FALSE", prompt: "Финальный проект оценивается только по технической сложности.", options: ["Верно", "Неверно"], correctAnswer: { index: 1 }, points: 1 },
        ],
      },
      assignment: {
        title: "Финальный проект: план внедрения ИИ",
        instructions: "Разработайте план внедрения ИИ-решения в своём подразделении. Структура: описание задачи, выбор направления, концепция, логика, план поэтапного внедрения (3-4 шага), оценка эффекта и рисков. Формат сдачи: документ (Word/Google Docs) + презентация (10-15 слайдов).",
        maxAttempts: 3,
        maxScore: 100,
      },
    },
  ];

  for (const modData of modulesData) {
    const mod = await prisma.module.create({
      data: {
        courseId: course.id,
        title: modData.title,
        description: modData.description,
        order: modData.order,
        recommendedDays: modData.recommendedDays,
        status: CourseStatus.PUBLISHED,
      },
    });

    let lessonOrder = 1;
    for (const lessonData of modData.lessons) {
      const lesson = await prisma.lesson.create({
        data: {
          moduleId: mod.id,
          title: lessonData.title,
          summary: lessonData.summary,
          type: lessonData.type,
          order: lessonOrder++,
          durationMinutes: lessonData.durationMinutes,
          isRequired: true,
          content: { blocks: lessonData.blocks },
        },
      });

      // Create quiz if lesson has quiz block
      const hasQuizBlock = lessonData.blocks.some((b) => b.type === "quiz");
      if (hasQuizBlock && modData.quiz) {
        const quiz = await prisma.quiz.create({
          data: {
            courseId: course.id,
            lessonId: lesson.id,
            title: modData.quiz.title,
            description: modData.quiz.description,
            passThreshold: modData.quiz.passThreshold,
            maxAttempts: modData.quiz.maxAttempts,
            questions: {
              create: modData.quiz.questions.map((q, i) => ({
                type: q.type as never,
                prompt: q.prompt,
                options: q.options,
                correctAnswer: q.correctAnswer,
                points: q.points,
                order: i,
              })),
            },
          },
        });
        // Update lesson content with quizId
        const updatedBlocks = lessonData.blocks.map((b) =>
          b.type === "quiz" ? { ...b, data: { quizId: quiz.id } } : b
        );
        await prisma.lesson.update({
          where: { id: lesson.id },
          data: { content: { blocks: updatedBlocks } },
        });
      }
    }

    // Create assignment for the module (linked to last lesson)
    if (modData.assignment) {
      const lastLesson = await prisma.lesson.findFirst({
        where: { moduleId: mod.id },
        orderBy: { order: "desc" },
      });
      if (lastLesson) {
        await prisma.assignment.create({
          data: {
            courseId: course.id,
            lessonId: lastLesson.id,
            title: modData.assignment.title,
            instructions: modData.assignment.instructions,
            maxAttempts: modData.assignment.maxAttempts,
            maxScore: modData.assignment.maxScore,
          },
        });
      }
    }

    console.log(`  Module created: ${mod.title} (${modData.lessons.length} lessons)`);
  }

  // Enroll students 1-10
  const students = await prisma.user.findMany({
    where: { email: { startsWith: "student" } },
  });

  for (const student of students) {
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
      update: { status: "ACTIVE" },
      create: {
        userId: student.id,
        courseId: course.id,
        status: "ACTIVE",
      },
    });
  }

  console.log(`\nEnrolled ${students.length} students`);

  // Add observer project link
  const observer = await prisma.user.findUnique({
    where: { email: "observer@academy.local" },
  });

  if (observer) {
    await prisma.observerProject.upsert({
      where: {
        userId_projectId: { userId: observer.id, projectId: "demo-project" },
      },
      update: {},
      create: {
        userId: observer.id,
        projectId: "demo-project",
      },
    });
    console.log("Linked observer to demo-project");
  }

  console.log("\nDemo course created successfully!");
  console.log(`Course ID: ${course.id}`);
  console.log(`Slug: ${course.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
