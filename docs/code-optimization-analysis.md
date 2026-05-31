# Code Optimization Analysis

> AI Strategic Academy — 2026-05-26; актуализация dependency hygiene — 2026-05-31

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

## ✅ Dependency Hygiene Closed

### 1. `firebase-admin` — удалено 2026-05-31

- **Локация**: `package.json` dependencies
- **Было**: `firebase-admin@13.10.0` был установлен без runtime-импортов во всём коде.
- **Фикс**: выполнено `npm uninstall firebase-admin`; `package.json` и `package-lock.json` больше не содержат зависимость.
- **Текущий push-стек**: `server/modules/notifications/push.ts` использует `web-push` + VAPID (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`).
- **Эффект**: меньше dependency surface и нет расхождения между кодом, env-контрактом и deployment checklist.

### 2. `archiver` — явно объявлен в dependencies

- **Локация**: `app/api/v1/certificates/bulk/route.ts:8` — `import archiver from "archiver"`
- **Было**: пакет приходил транзитивно через `exceljs@4.4.0`, что создавало риск runtime-ошибки при обновлении ExcelJS.
- **Текущее состояние**: `archiver@^7.0.1` и `@types/archiver@^7.0.0` объявлены явно.
- **Статус**: закрыто; endpoint bulk certificates больше не зависит от транзитивной зависимости ExcelJS.

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

**Статус 2026-05-31**: исходный hotspot `assertInstructorOfCourse()` закрыт. Функция теперь делает один `findUnique` с `include` для ролей и `courseInstructors`, поэтому instructor/admin проверка не добавляет второй round trip.

```typescript
// Current optimized shape:
const user = await prisma.user.findUnique({
  where: { id },
  include: { roles: ..., courseInstructors: { where: { courseId } } }
});
```

**Оставшийся аудит**: module/lesson lookup paths в `server/modules/courses/service.ts` ещё стоит держать в performance backlog, но это уже не критичный duplicate-query blocker.

### ✅ Direct Prisma in `app/` pages (WP3 закрыт 2026-05-30)

На момент аудита 2026-05-26 было найдено **27 page files** в `app/`, которые импортировали Prisma напрямую вместо server modules:

- `app/admin/` — 8 pages (analytics, audit, certificates, cohorts x3, reports, users)
- `app/instructor/` — 5 pages (assignments, deadlines, quizzes, quizzes/edit, reports)
- `app/curator/` — 3 pages (assignments, popups, questions)
- `app/student/` — 2 pages (reports, quizzes/result)
- `app/super-curator/` — 3 pages (chat, cohorts, questions)

**Текущее состояние:** WP3 закрыт 2026-05-30. Прямой Prisma Client удалён из `app/**/page.tsx` и `components/**`, общие page queries вынесены в `server/modules/page-data/service.ts`, а `tests/unit/release-hardening-readiness.test.ts` блокирует возврат `@/lib/prisma`, `getPrisma()` и `prisma.*` в UI-слой.

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
| `firebase-admin` в dependencies | ~13MB | ✅ Удалено 2026-05-31 |
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

1. **✅ `firebase-admin` удалён**: активный push-стек зафиксирован как Web Push/VAPID.
2. **✅ `archiver` добавлен в dependencies**: bulk-certificate endpoint не зависит от транзитивного пакета ExcelJS.
3. **✅ `assertInstructorOfCourse` оптимизирован**: один `findUnique` с `include` вместо двух запросов.

### Priority 2 (Эта неделя)

4. **🟡 Сократить client components**: Перевести 5-7 простых компонентов в Server Components — уменьшит JS бандл
5. **🟡 Добавить `cache()` в learning & certificates services**: Дополнить `cache()` для типовых `findUnique` вызовов
6. **✅ WP3 закрыт**: сохранить regression guard для запрета Prisma в `app/**/page.tsx` и `components/**`

### Priority 3 (Nice to Have)

7. **Добавить Prisma error-хендлер**: Глобальный обработчик `P2002`/`P2025` в сервисном слое
8. **Почистить `services/` директорию**: Удалить reference microservices или явно задокументировать как устаревшие
9. **Проверить `locales/`**: Если i18n не используется, удалить

---

## 📊 Expected Impact

| Изменение | Impact |
|---|---|
| Удаление firebase-admin | ✅ Выполнено 2026-05-31: меньше node_modules, быстрее install, ниже dependency risk |
| AssertInstructorOfCourse | ✅ Закрыто: -1 DB round trip на каждую instructor/admin scope-проверку |
| WP3 (Prisma в server modules) | ✅ Закрыто 2026-05-30: чистая архитектура, тестируемость, переиспользование |
| `cache()` на типовые запросы | До -2x DB round trips на страницу при рендеринге |
| Конвертация в Server Components | -JS бандл ~5-15%, быстрее FCP |

---

## Automated Checks Performed

| Check | Result |
|---|---|
| `npm run lint -- --max-warnings=0` | ✅ 0 errors, 0 warnings |
| `npm run typecheck` | ✅ Clean |
| `npm run test` | ✅ 451/451 passed |
| Prisma in UI pages | ✅ WP3 cleanup closed 2026-05-30, unit-guard added |
| N+1 detection | 🟡 Основной `assertInstructorOfCourse` hotspot закрыт; module/lesson lookup paths остаются backlog |
| Dead code (firebase-admin) | ✅ Removed 2026-05-31 |
| Unused deps detection | ✅ No other unused deps found |
