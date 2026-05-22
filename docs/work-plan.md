# Work Plan: AI Strategic Academy

**Начало:** 2026-05-22

План работ с отслеживанием статуса. Каждая задача отмечается по мере выполнения.

---

## Задача 1: Отключение самосброса пароля

**Статус:** ✅ Завершено (2026-05-22)

| Шаг | Действие | Статус |
|-----|----------|--------|
| 1.1 | Изменить страницу `/forgot-password` — убрать форму, показать сообщение: написать на admin@aistrategic.kz | ✅ |
| 1.2 | Отключить API `/api/v1/auth/forgot-password` — возвращать 410 Gone | ✅ |
| 1.3 | Отключить API `/api/v1/auth/reset-password` — возвращать 410 Gone | ✅ |
| 1.4 | Изменить страницу `/reset-password` — перенаправлять на `/forgot-password` | ✅ |
| 1.5 | Обновить e2e тест forgot-password | ✅ |
| 1.6 | Обновить `docs/updates.md` | ✅ |

---

## Задача 2: Исправление Prisma schema ↔ migration (12 critical)

**Статус:** ✅ Завершено (2026-05-22)

**Что сделано:**
- Создана миграция `20260522000003_fix_schema_mismatches` с ALTER TABLE для всех 12 расхождений
- Все 14 миграций применены (`prisma migrate resolve --applied`)
- `prisma migrate diff` подтверждает: **База ↔ Schema: нет расхождений**
- `prisma migrate status`: Database schema is up to date!
- `prisma generate` успешно
- Typecheck: ✅ | Tests 377/377 ✅

| Шаг | Действие | Статус |
|-----|----------|--------|
| 2.1 | `lesson_progress` — ADD `started_at`, `last_seen_at` | ✅ |
| 2.2 | `assignment_submissions` — RENAME `created_at` → `submitted_at`, DROP `updated_at` | ✅ |
| 2.3 | `activity_logs` — RENAME `entity/resource`, ADD `ip_address`, `session_id`, FIX FK CASCADE | ✅ |
| 2.4 | `risk_flags` — RENAME `student_id` → `user_id`, ADD `cohort_id`, FIX FK CASCADE | ✅ |
| 2.5 | `reports` — ADD `project_id`, `course_id`, `url`, DROP `created_by_id`, ALTER DEFAULT | ✅ |
| 2.6 | `admin_popups` — ADD `target_user_ids` | ✅ |
| 2.7 | `messages` — ADD `reply_to_id` + index | ✅ |
| 2.8 | `certificates` — ADD UNIQUE INDEX `(user_id, course_id)` | ✅ |
| 2.9 | `course.finalAssignmentId` — ADD FK constraint | ✅ |
| 2.10 | `quizzes.maxAttempts` — ALTER DEFAULT 3, `reports.status` — ALTER DEFAULT 'ready' | ✅ |
| 2.11 | FK onDelete: `activity_logs`→CASCADE, `risk_flags`→CASCADE | ✅ |

---

## Задача 3: Исправление quiz grading logic

**Статус:** ✅ Завершено (2026-05-22)

**Что сделано:**
- Полностью переписан `gradeObjectiveQuiz` — теперь `resolveOptionLabel` применяется к ОБОИМ сторонам сравнения (expected + actual), что устраняет mismatch при object-options
- Добавлены 8 новых тестов: object options с id/label (index, label, id форматы), multi-choice, wrong answer rejection
- **Тесты: 385/385** (было 377, +8 новых)

| Шаг | Действие | Статус |
|-----|----------|--------|
| 3.1 | Переписать `gradeObjectiveQuiz` — resolveOption на обе стороны | ✅ |
| 3.2 | Добавить тесты на все форматы (index, label, ID, value, multi-select, object options) | ✅ |

---

## Задача 4: Rate limiter fail-open → fail-closed

**Статус:** ✅ Завершено (2026-05-22)

| Шаг | Действие | Статус |
|-----|----------|--------|
| 4.1 | `lib/rate-limit.ts` — изменить catch block на `{ success: false }` | ✅ |
| 4.2 | `lib/rate-limit.ts` — атомарный INCR (`cacheIncr` с Redis INCR + memory fallback) | ✅ |
| 4.3 | `proxy.ts` — ключ per-IP (без per-path) | ✅ |

---

## Задача 5: CSRF + submissions leak (security)

**Статус:** ✅ Завершено (2026-05-22)

| Шаг | Действие | Статус |
|-----|----------|--------|
| 5.1 | `proxy.ts` — добавить scheme check в CSRF | ✅ |
| 5.2 | `proxy.ts` — заменить `!isPublicRoute` на bypass-list (только webhooks/cron) | ✅ |
| 5.3 | `assignments/service.ts` — `listAssignments`: фильтр `{ userId }` для студентов | ✅ |
| 5.4 | `lib/auth/rbac.ts` — пустые роли возвращают `false` (защита от неполных JWT) | ✅ |

---

## Задача 6: Race conditions

**Статус:** ✅ Завершено (2026-05-22)

| Шаг | Действие | Статус |
|-----|----------|--------|
| 6.1 | `progress/service.ts` — sequential unlock перенесён ВНУТРЬ `$transaction` | ✅ |
| 6.2 | `progress/service.ts` — `SELECT ... FOR UPDATE` на enrollment в начале tx | ✅ |
| 6.3 | `quizzes/service.ts` — FOR UPDATE на enrollment, count+create в tx | ✅ |
| 6.4 | `assignments/service.ts` — FOR UPDATE на enrollment, count+create в tx | ✅ |
| 6.5 | `auth/service.ts` — атомарный `delete` вместо `findUnique`+`delete` | ✅ |
| 6.6 | `outbox/service.ts` — rescue cutoff по `updated_at` с `updated_at = NOW()` при dequeue | ✅ |
| 6.7 | `certificates/service.ts` — добавлен `findFirst` check перед create | ✅ |

---

## Задача 7: Аудит документации и устранение несостыковок

**Статус:** ✅ Завершено (2026-05-22)

| Шаг | Действие | Статус |
|-----|----------|--------|
| 7.1 | Создать `/admin/invites` — страница-заглушка (редирект `/admin/payments` в 404) | ✅ |
| 7.2 | Создать `_prisma_migrations` на Supabase, внести все 15 resolved миграций | ✅ |
| 7.3 | Обновить `full-project-audit.md` — тесты 368→385, lint `broken`→`done`, `/admin/invites` `missing`→`done` | ✅ |
| 7.4 | Обновить `vercel-supabase-deployment.md` — 100MB→20MB, PostgreSQL 15→17 | ✅ |
| 7.5 | Обновить `platform-functional-overview.md` — `/student/modules/[moduleId]` помечен как удалённый | ✅ |
| 7.6 | Чат: `max-w-5xl mx-auto` для стандартной ширины окна чата | ✅ |
| 7.7 | Чат: адаптивная и настраиваемая высота окна чата в `ChatPanel` для предотвращения переполнения на мобильных и в модальных окнах | ✅ |

---

## Задача 8: Автосжатие изображений при загрузке

**Статус:** ✅ Завершено (2026-05-22)

| Шаг | Действие | Статус |
|-----|----------|--------|
| 8.1 | Создать `lib/client-image-compress.ts` — Canvas-based сжатие (1920px max, JPEG 80%, пропуск GIF/<50KB) | ✅ |
| 8.2 | Создать `lib/upload-with-compress.ts` — обёртки `uploadMedia()` и `uploadChatFile()` | ✅ |
| 8.3 | Интегрировать в `chat-panel.tsx` — чат | ✅ |
| 8.4 | Интегрировать в `assignment-block.tsx` — загрузка к заданию | ✅ |
| 8.5 | Интегрировать в `assignment-view.tsx` — студент | ✅ |
| 8.6 | Интегрировать в `course-builder-shell.tsx` — обложка курса | ✅ |
| 8.7 | Интегрировать в `lesson-block-editor.tsx` — файлы уроков | ✅ |
| 8.8 | Написать тесты (11 шт.) — Node.js mocks для Canvas API | ✅ |
