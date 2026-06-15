# Implementation Roadmap: Product Vision → Code

> Дата актуализации: 2026-06-15
> Статус: план (код не затронут)

---

## Как этот документ связан с MASTER-PLAN.md

Этот документ — product-driven дополнение к `docs/MASTER-PLAN.md`. Если MASTER-PLAN описывает технический roadmap (фазы 0–4), то этот документ описывает, **какие продуктовые возможности в какой последовательности внедрять в код**, чтобы платформа стала продаваемым корпоративным AI-продуктом.

---

## Этапы внедрения

### Stage 1: Product docs ✅ (текущий)

**Что сделано:** создана папка `docs/product/` с 7 файлами:

| Файл | Назначение |
|------|-----------|
| `positioning.md` | Бизнес-позиционирование, роли, коммерческий сценарий |
| `ai-productivity-bootcamp.md` | Структура 4-недельного буткемпа |
| `pricing.md` | Тарифы Standard / Pro / Enterprise |
| `customer-report-template.md` | Шаблоны weekly и final report |
| `final-project-rubric.md` | Рубрика оценки финальной работы |
| `success-metrics.md` | Ключевые метрики успеха |
| `implementation-roadmap.md` | **Этот файл** — как внедрять в код |

**Проверки:** lint, typecheck — не затрагивают код.

---

### Stage 2: Productivity Score Service

**Цель:** сервис расчёта AI Productivity Score (0–100).

**Что сделать:**
1. Создать `server/modules/productivity-score/service.ts`
2. Компоненты score:

   | Компонент | Вес | Источник данных |
   |-----------|:---:|-----------------|
   | Диагностика до/после | 20% | Survey (новая сущность) |
   | Тесты | 20% | QuizAttempt |
   | Практические задания | 30% | AssignmentSubmission |
   | Финальная работа | 20% | Final project assessment |
   | Активность и завершение | 10% | CourseProgress, ActivityLog |

3. Если диагностики нет — компонент помечается `not_available`, расчёт не ломается
4. Метод `calculateForStudent(userId, courseId)` → `{ score, level, breakdown }`
5. Метод `calculateForCohort(cohortId)` → `{ average, distribution, breakdown }`
6. RBAC: только свои данные, student не видит чужой score
7. Уровни: Beginner (0–39), Practitioner (40–69), Advanced User (70–89), Champion (90–100)

**Файлы для изменения:**

| Файл | Действие |
|------|----------|
| `server/modules/productivity-score/service.ts` | ✅ Создать |
| `server/modules/productivity-score/__tests__/service.test.ts` | ✅ Создать |
| `server/modules/productivity-score/index.ts` | ✅ Создать (barrel export) |

**Проверки:** `npm run test`, `npm run typecheck`

---

### Stage 3: Final Project Metadata

**Цель:** добавить структуру для финальной работы как automation artifact.

**Что сделать:**
1. Изучить существующие модели: `Assignment`, `AssignmentSubmission`, `Course`
2. Если `Course.finalAssignmentId` уже есть — использовать его
3. Добавить Zod-схему `finalProjectMetadata` с полями:

   ```typescript
   const finalProjectMetadataSchema = z.object({
     taskName: z.string(),
     beforeDescription: z.string(),
     afterDescription: z.string(),
     aiTools: z.array(z.string()),
     artifactUrl: z.string().url().optional(),
     artifactText: z.string().optional(),
     timeSaved: z.string().optional(), // "3 ч/нед"
     rubricScores: z.object({
       relevanceToJob: z.number().min(0).max(20),
       beforeAfter: z.number().min(0).max(20),
       meaningfulAI: z.number().min(0).max(20),
       artifact: z.number().min(0).max(20),
       timeEstimate: z.number().min(0).max(10),
       reusability: z.number().min(0).max(10),
     }).optional(),
     totalScore: z.number().min(0).max(100).optional(),
     level: z.enum(["beginner", "practitioner", "advanced", "champion"]).optional(),
     curatorComment: z.string().optional(),
     reviewStatus: z.enum(["pending", "approved", "changes_requested"]),
     showInReport: z.boolean().default(false),
   });
   ```

4. Если существующая модель `AssignmentSubmission` уже есть и у неё есть `metadata` JSON-поле — использовать его (не плодить сущности)
5. Если `metadata` нет — добавить минимальную миграцию

**Файлы для изменения:**

| Файл | Действие |
|------|----------|
| `lib/validation.ts` | ✅ Добавить `finalProjectMetadataSchema` |
| `types/domain.ts` | ✅ Добавить `FinalProjectMetadata` interface |
| `server/modules/assignments/service.ts` | ✅ Добавить валидацию/сохранение metadata |
| `prisma/schema.prisma` | ⚠️ Только если нет `metadata` поля |
| `tests/unit/final-project.test.ts` | ✅ Создать |

**Проверки:** `npx prisma validate`, `npm run db:generate`, `npm run test`, `npm run typecheck`

---

### Stage 4: Post-course Survey

**Цель:** минимальная структура для финального опроса.

**Что сделать:**
1. Добавить Zod-схему `courseSurveyMetadata`:

   ```typescript
   const courseSurveyMetadataSchema = z.object({
     satisfaction: z.number().min(1).max(5),
     nps: z.number().min(0).max(10),
     usefulness: z.number().min(1).max(5),
     applicability: z.number().min(1).max(5),
     automationSummary: z.string().optional(),
     improvementSuggestions: z.string().optional(),
     publicComment: z.boolean().default(false),
     publicCommentText: z.string().optional(),
     submittedAt: z.string().datetime(),
   });
   ```

2. Если есть подходящая модель (например, `LessonRating` с полем `courseId`) — расширить её
3. Если нет — использовать metadata JSON-поле на существующей модели или создать минимальную Prisma-модель

**Файлы для изменения:**

| Файл | Действие |
|------|----------|
| `lib/validation.ts` | ✅ Добавить `courseSurveyMetadataSchema` |
| `types/domain.ts` | ✅ Добавить `CourseSurveyMetadata` |
| `server/modules/survey/service.ts` | ✅ Создать |
| `tests/unit/survey-service.test.ts` | ✅ Создать |

**Проверки:** `npm run test`, `npm run typecheck`

---

### Stage 5: Weekly / Final Report

**Цель:** добавить типы отчётов `weekly_cohort` и `final_cohort` в существующий ReportDesigner.

**Что сделать:**
1. Изучить существующую систему отчётов (`server/modules/reports/`)
2. Если типы отчётов заданы enum'ом — добавить новые значения
3. Реализовать генерацию weekly report по шаблону из `customer-report-template.md`
4. Реализовать генерацию final report
5. Поддержать PDF, XLSX, CSV через существующие механизмы

**Файлы для изменения:**

| Файл | Действие |
|------|----------|
| `server/modules/reports/types.ts` | ✅ Добавить `weekly_cohort`, `final_cohort` |
| `server/modules/reports/service.ts` | ✅ Добавить генераторы |
| `server/modules/reports/processor.ts` | ✅ Подключить новые типы |
| `types/domain.ts` | ✅ Добавить типы отчётов |
| `tests/unit/reports-service.test.ts` | ✅ Добавить тесты |

**Проверки:** `npm run test`, `npm run typecheck`, `npm run build`

---

### Stage 6: UX Improvements by Role

**Цель:** улучшить дашборды student, curator и customer observer.

**Что сделать:**

#### Student dashboard
- Кнопка `Продолжить обучение` на главной
- Показать текущий модуль/урок
- Показать прогресс курса
- Показать дедлайн
- Показать путь к сертификату
- После урока: показать следующий шаг, не отправлять в меню

#### Curator dashboard
- Приоритет: риски → вопросы → задания на проверку
- SLA-статус ответов
- Фильтр по потоку и severity
- Быстрый ответ из глоссария

#### Customer observer dashboard
- Только свои потоки
- Прогресс, риски, сертификаты, артефакты
- Скачивание weekly/final отчёта
- Нет edit/mutation действий

**Файлы для изменения:** дашборды в `app/[role]/`, компоненты в `components/[role]/`

**Проверки:** `npm run lint -- --max-warnings=0`, `npm run typecheck`, `npm run test`, `npm run build`

---

### Stage 7: E2E / Release Safety

**Цель:** добавить Playwright-сценарии для key flows.

**Что сделать:**
- Admin: создать клиента → поток → назначить курс → проверить отчёты
- Student: войти → пройти урок → сдать тест → задать вопрос → сдать финальную работу
- Curator: ответить на вопрос → проверить задание → оценить финальную работу
- Observer: войти → увидеть только свой поток → скачать отчёт

**Проверки:** `npm run test:e2e`, `npm run verify`

---

## Приоритет

```
Stage 1 (docs)     →   ✅ СЕЙЧАС
Stage 2 (score)    →   ⏳ СЛЕДУЮЩИЙ
Stage 3 (final)    →   📋 ПОТОМ
Stage 4 (survey)   →   📋 ПОТОМ
Stage 5 (reports)  →   📋 ПОТОМ
Stage 6 (UX)       →   📋 ПОТОМ
Stage 7 (E2E)      →   📋 ПОТОМ
```

## Ключевые риски

| Риск | Описание | Митигация |
|------|----------|-----------|
| Нарушение RBAC | Новые сервисы могут не учесть скоуп | Каждый endpoint проверять через existing guard |
| Поломка существующих отчётов | Новые типы могут задеть логику генерации | Добавлять новые типы отдельно, не трогать старые |
| Миграция данных | Новые поля/таблицы могут затронуть production | `prisma validate` + тестирование на disposable DB |
| Зависимость от окружения | E2E, Docker, Supabase могут быть недоступны | Фиксировать в отчёте, давать manual QA чеклист |
