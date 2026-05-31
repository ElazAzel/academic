# Code Optimization Analysis

> AI Strategic Academy — 2026-05-26

---

## 📊 Analysis Scope

| Metric | Value |
|---|---|
| Files scanned | 532 (131 components, 327 app pages/routes, 74 server) |
| Languages | TypeScript (strict), TSX, CSS, Prisma |
| Frameworks | Next.js 16, Prisma 7, Auth.js 4, shadcn/ui, Vitest |
| Lint | 0 errors, 0 warnings (`--max-warnings=0`) |
| Typecheck | ✅ Clean |
| Tests | 451/451 passed (72 files, 20.84s) |

---

## 🔴 Critical Issues

### 1. `firebase-admin` — полностью мёртвая зависимость, 13MB+

- **Локация**: `package.json` dependencies
- **Проблема**: `firebase-admin@13.10.0` установлен, но **ноль импортов** во всём коде. `rg -r "firebase"` — 0 совпадений.
- **Риски**:
  - +13MB в `node_modules/` на каждый деплой (Vercel, Docker)
  - Лишняя поверхность атаки (Firebase Admin SDK имеет доступ к Google APIs)
  - Увеличивает время `npm ci` в CI
- **Фикс**: `npm uninstall firebase-admin`

### 2. `archiver` — используется, но не объявлен в dependencies

- **Локация**: `app/api/v1/certificates/bulk/route.ts:8` — `import archiver from "archiver"`
- **Проблема**: Пакет не указан явно в `dependencies`. Он приходит транзитивно через `exceljs@4.4.0`. Если `exceljs` обновится и уберёт `archiver` из своих зависимостей, bulk-certificate endpoint упадёт с runtime-ошибкой.
- **Фикс**: `npm install archiver`

---

## ⚡ Performance Issues

### 🟡 Prisma N+1 Patterns

Файлы с наибольшим количеством `findUnique` (>5), которые потенциально работают внутри циклов:

| Файл | findUnique/findFirst | В loop контексте | Риск |
|---|---|---|---|
| `server/modules/courses/service.ts` | 15 | 3 (lines 37-39, 383, 428) | Средний |
| `server/modules/learning/service.ts` | 12 | — | Низкий (include-heavy) |
| `server/modules/course-builder/service.ts` | 8 | — | Средний |
| `server/modules/deadlines/service.ts` | 7 | — | Средний |
| `server/modules/certificates/service.ts` | 6 | — | Низкий |

**Деталь**: `assertInstructorOfCourse()` (courses/service.ts:32-44) делает 2 последовательных `findUnique` вместо одного с `include`. Вызывается во всех instructor-scoped операциях (createBlock, updateBlock, createLesson, updateLesson и т.д.) — каждая мутация добавляет +1 round trip.

```typescript
// Current (2 queries):
const user = await prisma.user.findUnique({ where: { id }, include: { roles: ... } });
const instructor = await prisma.courseInstructor.findUnique({ where: { courseId_userId: ... } });

// Optimized (1 query with include):
const user = await prisma.user.findUnique({
  where: { id },
  include: { roles: ..., courseInstructors: { where: { courseId } } }
});
```

### 🟡 Direct Prisma in `app/` pages (WP3 не начат)

**27 page files** in `app/` импортируют Prisma напрямую вместо server modules:

- `app/admin/` — 8 pages (analytics, audit, certificates, cohorts x3, reports, users)
- `app/instructor/` — 5 pages (assignments, deadlines, quizzes, quizzes/edit, reports)
- `app/curator/` — 3 pages (assignments, popups, questions)
- `app/student/` — 2 pages (reports, quizzes/result)
- `app/super-curator/` — 3 pages (chat, cohorts, questions)

**Проблема**: Каждая такая page тянет Prisma Client в server component bundle. Принцип "Prisma only in server/modules" нарушен (архитектурное решение WP3). Прямые запросы в pages сложнее тестировать и реиспользовать.

### 🟡 `cache()` — используется только 3 раза

Из всех server modules, Next.js `cache()` применяется только в `courses/service.ts` (3 функции). Все остальные запросы при рендеринге не deduplicate-ятся. Если одна страница вызывает `getCourse(id)` и `getLessons(courseId)`, и обе внутри вызывают `getCourse(id)` — будет 2 запроса вместо 1.

**Recommendation**: Добавить `cache()` вокруг `findUnique` в learning service и certificates service.

---

## 🔒 Security

### Известные (зафиксированы в security-review.md)

| Проблема | Статус |
|---|---|
| Supabase password в git history (`__dbcheck.mjs`) | ⚠️ Требуется ротация |
| CSP scripts без `'unsafe-inline'` | ✅ Nonce-based `script-src`; `'unsafe-inline'` остаётся только для `style-src` |
| CSRF guard в proxy.ts | ✅ Работает |
| Argon2id | ✅ |
| RBAC через requirePermission / requireRolePage | ✅ |
| Zod во всех server actions | ✅ |

### Дополнительно найденное

- **rate-limit.ts** динамически импортирует `ioredis` (3 LOC) — нормально, работает как fallback между local и Upstash
- **Ни одного deprecated API endpoint** — все 410 Gone endpoints задокументированы
- **services/ директория** (не компилируется) содержит reference architecture microservices — не представляет угрозы

---

## ⚠️ Potential Issues & Edge Cases

### 🟡 Error handling в server actions

Все 20 server actions содержат try-catch — ✅. Однако:

- В `server/modules/` есть функции без try-catch, которые пробрасывают Prisma-ошибки наверх. Prisma `P2002` (unique constraint) или `P2025` (not found) могут уйти в Next.js error boundary как 500, если не обработаны.
- Пример: `server/modules/courses/service.ts:createBlock` — если `moduleId` невалидный, ошибка `P2025` от `block.create` не перехвачена (хотя выше есть guard).

### 🟢 Sessions сервис в `lib/auth/session.ts`

```typescript
// line 20: dynamic import для избежания циклической зависимости
const { getPrisma } = await import("@/lib/prisma");
```

Этот паттерн корректен — ломает цикл зависимостей. Однако dynamic import внутри server action = асинхронная загрузка модуля при каждом вызове. V8 может кешировать, но это не гарантировано.

---

## 🏗️ Architecture & Maintainability

### Мёртвый код

| Артефакт | Размер | Статус |
|---|---|---|
| `firebase-admin` в dependencies | ~13MB | 🔴 Полностью мёртв |
| `services/` директория | 5 микросервисов | 🟡 Reference architecture, не компилируется |
| `locales/` директория | ? | 🟡 Проверить, используется ли i18n (UI Russian-only) |

### 125 client components — много для App Router

Проект имеет **125 `"use client"` директив**. В Next.js 16 каждый client component — это JS-бандл, который тянет hydration runtime. Компоненты, которые только рендерят данные (нет хуков, событий, state), могут быть Server Components.

**Кандидаты на конвертацию в Server Components** (нет `useEffect`, `useState`, `useCallback`):
- `components/lms/list-toolbar.tsx`
- `components/lms/error-fallback.tsx`
- `components/lms/page-error.tsx`
- `components/lms/theme-toggle.tsx` (только `setMounted`)
- `components/lms/lesson-rating.tsx`
- `components/admin/user-filters.tsx`
- `components/admin/activity-filters.tsx`

### Prisma Client — дублирование в каждом server action

Каждый из 20+ server actions делает `import { getPrisma } from "@/lib/prisma"`. При сборке Next.js это означает, что Prisma Client включается в бандл каждого action. Альтернатива — единый `server/modules/prisma.ts`-middleware, но это требует архитектурной переработки (выходит за рамки P3/P4).

---

## 💡 Optimization Recommendations

### Priority 1 (Immediate — <1 час)

1. **🔴 Удалить `firebase-admin`**: `npm uninstall firebase-admin` — экономит ~13MB в каждом деплое
2. **🔴 Добавить `archiver` в dependencies**: `npm install archiver` — предотвращает потенциальный runtime failure
3. **🟡 Оптимизировать `assertInstructorOfCourse`**: Один `findUnique` с `include` вместо двух (courses/service.ts:32-44)

### Priority 2 (Эта неделя)

4. **🟡 Сократить client components**: Перевести 5-7 простых компонентов в Server Components — уменьшит JS бандл
5. **🟡 Добавить `cache()` в learning & certificates services**: Дополнить `cache()` для типовых `findUnique` вызовов
6. **🟡 Начать WP3**: Вынести Prisma из `app/admin/*`, `app/instructor/*`, `app/curator/*` pages в server/modules

### Priority 3 (Nice to Have)

7. **Добавить Prisma error-хендлер**: Глобальный обработчик `P2002`/`P2025` в сервисном слое
8. **Почистить `services/` директорию**: Удалить reference microservices или явно задокументировать как устаревшие
9. **Проверить `locales/`**: Если i18n не используется, удалить

---

## 📊 Expected Impact

| Изменение | Impact |
|---|---|
| Удаление firebase-admin | -13MB node_modules, -30s npm ci, -риск |
| AssertInstructorOfCourse | -1 DB round trip на каждую instructor-мутацию |
| WP3 (Prisma в server modules) | Чистая архитектура, тестируемость, переиспользование |
| `cache()` на типовые запросы | До -2x DB round trips на страницу при рендеринге |
| Конвертация в Server Components | -JS бандл ~5-15%, быстрее FCP |

---

## Automated Checks Performed

| Check | Result |
|---|---|
| `npm run lint -- --max-warnings=0` | ✅ 0 errors, 0 warnings |
| `npm run typecheck` | ✅ Clean |
| `npm run test` | ✅ 451/451 passed |
| Prisma in UI pages | ⚠️ 27 pages need migration to server/modules |
| N+1 detection | ⚠️ 3 confirmed cases in courses/service.ts |
| Dead code (firebase-admin) | 🔴 Confirmed dead |
| Unused deps detection | ✅ No other unused deps found |
