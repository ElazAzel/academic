# Build & Performance Optimizations — Design Doc

**Дата:** 2026-05-30
**Статус:** Approved
**Выбранный подход:** C — Full performance overhaul

---

## Текущие метрики

| Метрика | Значение |
|---------|----------|
| Страниц | 104 |
| Server bundle | 105.63 MB |
| Client bundle | 3.07 MB |
| Прямые зависимости | 68 |

### Тяжелые зависимости (node_modules)

| Пакет | Size | Использование |
|-------|------|---------------|
| next | 148 MB | Фреймворк |
| @prisma/client | 75 MB | ORM |
| lucide-react | 27 MB | Иконки |
| hls.js | 24 MB | Видео |
| date-fns | 22 MB | Даты |
| exceljs | 21 MB | Экспорт XLSX |
| pdf-lib | 19 MB | PDF сертификаты |
| pdfmake | 15 MB | PDF отчёты |
| recharts | 6.4 MB | Графики |
| framer-motion | 4.5 MB | Анимации |

---

## Этап 1: Инструментарий + быстрые победы

### 1.1 Bundle Analyzer
- Установить `@next/bundle-analyzer`
- Скрипт `npm run analyze`
- После прогона — read visual report для точных решений

### 1.2 Консолидация PDF
- Удалить `pdfmake` (15 MB)
- Мигрировать report generation на `pdf-lib`
- **Проверка:** все отчёты генерируются корректно

### 1.3 Dynamic Imports
Сейчас тяжелые библиотеки тащатся в общий бандл через `'use client'`:

| Библиотека | Размер | Стратегия |
|-----------|--------|-----------|
| hls.js | 24 MB | `next/dynamic({ ssr: false })` — только страницы видео |
| exceljs | 21 MB | Dynamic import в серверном экшне (`await import('exceljs')`) |
| recharts | 6.4 MB | `next/dynamic` на дашбордах |
| canvas-confetti | <1 MB | Dynamic import — только сертификаты |
| framer-motion | 4.5 MB | Проверить — не импортится через barrel |

### 1.4 Аудит зависимостей
Проверить реальное использование и удалить неиспользуемые:
- `dompurify` / `isomorphic-dompurify`
- `cmdk`
- `otplib`
- `@tanstack/react-virtual`
- `vaul`

---

## Этап 2: Системная оптимизация

### 2.1 Анализ bundle-отчета
- Определить топ-5 самых тяжёлых чанков
- Выявить дублирование модулей (client/server)
- Проверить @prisma/client в клиентском бандле
- Проверить дубли react/react-dom

### 2.2 Аудит `'use client'` границ
- Все `'use client'` компоненты — действительно ли нужен клиент?
- Нет ли тяжелых библиотек, импортированных через barrel exports?
- Переместить клиентские компоненты ниже по дереву, где возможно

### 2.3 Route-level code splitting
- Группировка чанков по ролям (admin, instructor, student, curator)
- hls.js — только `/student/courses/[courseId]/lessons/*`
- exceljs — только `/admin/reports`, `/instructor/reports`
- recharts — только `*/analytics`, `*/reports`

### 2.4 next/image оптимизация
- Все `<img>` → `next/image`
- `sizes` атрибуты для responsive images
- `priority` для LCP (login page logo, dashboard hero)
- WebP/AVIF форматы

---

## Этап 3: Performance overhaul

### 3.1 Streaming SSR
- `<Suspense>` обёртки для медленных секций дашбордов
- Стриминг независимых секций (графики отдельно, таблицы отдельно)
- Параллельные Prisma запросы через `Promise.all`

**Приоритет:** `/admin/analytics`, `/instructor/analytics`, `/student/`

### 3.2 ISR для публичных страниц
| Страница | Режим | revalidate |
|----------|-------|------------|
| /login | `dynamic = 'force-static'` | — |
| /forgot-password | `dynamic = 'force-static'` | — |
| /verify-email | `dynamic = 'force-static'` | — |
| /privacy | ISR | 86400 (1 день) |
| /terms | ISR | 86400 (1 день) |

### 3.3 Preload/Prefetch стратегия
- `preload` для критических путей (login → student dashboard)
- `preconnect` для Supabase, Sentry, S3
- Аудит `next/link` prefetch

### 3.4 Шрифты
- `next/font` c Cyrillic subsetting
- `preload` основного шрифта
- `display=swap`

### 3.5 Виртуализация списков
- Длинные таблицы: `@tanstack/react-virtual`
- Бесконечная подгрузка где уместно

### 3.6 Prisma query audit
- `SELECT` только нужные поля
- batch aggregation
- Поиск N+1 в медленных эндпоинтах

---

## Критерии успеха

| Метрика | До | Цель после |
|---------|----|-----------|
| Server bundle | 105 MB | < 90 MB |
| Client bundle | 3.07 MB | < 2.5 MB |
| TTFB (login) | SSR | static (0ms) |
| LCP (dashboard) | SSR stream | stream start < 500ms |
| Build time | — | < 120s |
| `npm run verify` | ✅ | ✅ |
| Pages responsive | ✅ | ✅ |

## Проверка

После каждого подэтапа:
- `npm run lint` — 0 errors 0 warnings
- `npm run typecheck` — clean
- `npm run test` — все тесты pass
- `npm run build` — успешно
- Smoke-тест: login → student → admin → instructor → curator
