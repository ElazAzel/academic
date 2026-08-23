# Исследование экосистемы Next.js 16 / React 19 / shadcn / Tailwind

Проект «AI Strategic Academy»: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, lucide-react, Vercel. Ниже — применимые паттерны с конкретными ссылками. Без лицензионного кода: только структура, ссылки и короткие сниппеты.

## 1. Ролевые layout'ы и навигация

**Паттерн А — единый `SidebarProvider` + мобильный Sheet.**
shadcn-ui уже содержит готовый примитив: десктоп рисует `Sidebar`, на мобильном тот же компонент рендерится внутри `Sheet` (дровер). Состояние коллапса хранится в cookie `sidebar_state` `max-age=7d`.
- Источник: `shadcn-ui/ui` → `apps/www/registry/new-york/ui/sidebar.tsx` (хук `useSidebar`, `SidebarProvider`, `SidebarMenuButton` с `isActive`).
- Применение: `app/(dashboard)/layout.tsx` оборачивает `<SidebarProvider><AppSidebar/>{children}</SidebarProvider>`; активный пункт ведётся через `usePathname()`.

**Паттерн Б — мобильный bottom-nav.**
Для ролей «студент» на телефоне сайдбар неудобен. Добавляем фиксированный нижний бар (`fixed bottom-0 md:hidden`) с 4-5 иконками lucide (`Home`, `BookOpen`, `Trophy`, `User`). Скрываем на `md:` и выше.
- Пример реализации ролевой раскладки: `shadcn-ui/taxonomy` → `app/(application)/layout.tsx` (разделение ролей через группировку папок `(marketing)` / `(application)`).

**Паттерн В — command palette (⌘K).**
cmdk лежит в основе `Command` из shadcn. Глобальный слушатель: `useEffect` на `(e.metaKey||e.ctrlKey) && e.key==='k'`. Команды группируются (`Command.Group`) по ролям: «Перейти», «Действия», «Админ».
- Источник: `pacocoursey/cmdk` → `cmdk/src/index.tsx`; обёртка `shadcn-ui/ui` → `apps/www/registry/default/ui/command.tsx`.
- Сниппет ловушки: `<Command.Dialog open={open} onOpenChange={setOpen}>{/* Command.Input, Command.List, Command.Item onSelect={()=>router.push(href)} */}</Command.Dialog>`.

## 2. Bento-дашборды и карточки метрик

**Паттерн А — Magic UI `BentoGrid` + `BentoCard`.**
Карточки разного размера (`col-span-2`, `row-span-2`) дают визуальную иерархию без таблицы. Каждая карточка: `Icon`, `name`, `description`, `background`, `cta`.
- Источник: `magicuidesign/magicui` → `apps/www/registry/magicui/bento-grid.tsx` (демо `apps/www/registry/example/bento-demo.tsx`).
- Альтернатива (чистый shadcn, без анимаций): `shadcn-ui/ui` блок `dashboard-01` (sidebar + charts + data table).

**Паттерн Б — метрики как `Card` с трендом.**
Карточка метрики = `Card` + `CardHeader`(иконка+label) + `CardContent`(число `text-3xl font-semibold`) + дельта (`text-emerald-500` / `text-destructive`). Цвет дельты берёт семантический токен, не хардкод.

**Паттерн В — асимметрия через grid.**
`grid-cols-1 md:grid-cols-3 auto-rows-[10rem]`, крупная карточка `md:col-span-2 md:row-span-2`. Готовые варианты: `bentotailwind.com`, `shadcnblocks.com/blocks/bento` (53 блока, копипаст).

## 3. Тёмная тема и шрифты (Manrope)

**Паттерн А — `next/font` с CSS-переменной, без рантайм-запросов.**
Шрифт самохостится на билде, нет CLS. Переменная `--font-sans` мапится в Tailwind.
```ts
// app/layout.tsx
import { Manrope } from 'next/font/google'
const manrope = Manrope({ subsets: ['latin','cyrillic'], variable: '--font-sans', display: 'swap' })
// в <body className={manrope.variable}>
```
- Справка: `nextjs.org/docs/app/api-reference/components/font` (Next.js 16, версия доки 16.3.1).
- Manrope поддерживает кириллицу и имеет variable-axis 200–800 — один файл вместо пяти статичных весов.

**Паттерн Б — тёмная тема через `next-themes`.**
`ThemeProvider` с `attribute="class"`, переключение `.dark`. Сам shadcn берёт токены из `.dark`.
- Источник: `pacocoursey/next-themes` → `index.tsx` (хук `useTheme`, без мигания благодаря `suppressHydrationWarning` на `<html>`).

## 4. Design tokens и семантические цвета

**Паттерн А — semantic CSS-переменные (база shadcn).**
shadcn использует пары `token` / `token-foreground` в `:root` (light) и `.dark`. Компоненты зовут `bg-primary text-primary-foreground`, а не `bg-blue-500`.
- Справка: `shadcn-ui/ui` → `ui.shadcn.com/docs/theming` (токены `background`, `card`, `popover`, `primary`, `muted`, `accent`, `destructive`, `border`, `ring`).

**Паттерн Б — добавляем success/warning/info.**
shadcn из коробки НЕ даёт эти токены (обсуждение `shadcn-ui/ui` → `discussions/8986`). Добавляем сами в `globals.css`:
```css
:root { --success: 142 76% 36%; --success-foreground: 0 0% 100%;
        --warning: 38 92% 50%;  --warning-foreground: 0 0% 0%;
        --info: 214 100% 50%;   --info-foreground: 0 0% 100%; }
.dark { --success: 142 76% 46%; --warning: 38 92% 50%; --info: 214 100% 60%; }
```
Для Tailwind v4 маппинг через `@theme inline { --color-success: var(--success); }`. Тогда `bg-success text-success-foreground` работает везде. Каждый токен нужно продублировать в `.dark`, иначе в тёмной теме будет light-жёлтый.

**Паттерн В — статусы как Badge-варианты.**
`components/ui/badge.tsx` расширяем `cva`-вариантами `success | warning | info | destructive`. Иконка + цвет токена, никаких инлайн-хексов.

## 5. Vercel-деплой: Next.js 16 + Postgres

**Паттерн А — env-переменные только в дашборде Vercel.**
`.env.local` на Vercel не попадает. `DATABASE_URL`, `POSTGRES_URL` и секреты заводим в Project Settings → Environment Variables, отдельно scopes Production / Preview / Development. `NEXT_PUBLIC_*` — публичны, всё остальное серверное.
- Стартер: `vercel/nextjs-postgres-auth-starter` (Next.js + Tailwind + TS + Drizzle + NextAuth + Postgres).
- Гайд Next.js 16 + Prisma Postgres: `vercel.com/kb/guide/nextjs-prisma-postgres` (билд-хук `postinstall: prisma generate`).

**Паттерн Б — build-настройки.**
Vercel автодетектит Next.js: `next build`, output `.next`. Turbopack в 16 стабилен для `next dev`, но прод-билд пока на Webpack (ожидается позже в 2026). Ничего менять не нужно, кроме `postinstall` для генерации клиента БД.

**Паттерн В — ограничения и грабли.**
- Vercel НЕ хостит БД: Postgres берём у Vercel Postgres / Neon / Supabase, строку подключения кладём в `DATABASE_URL`.
- `NEXT_PUBLIC_URL` для OAuth и `NEXTAUTH_URL` должны указывать на прод-домен, не localhost — иначе 500.
- Привязка `DATABASE_URL` на билде нужна, если используется `prisma generate` с `directUrl` — иначе билд падает с «Environment variable not found».
- Серверные функции Hobby: таймаут 10с, 100 ГБ трафика. Тяжёлые импорты — в `next/dynamic`.

## Какие репозитории реально изучены

Открыты и процитированы по ссылкам выше:
- `shadcn-ui/ui` (sidebar.tsx, command.tsx, theming docs, discussions/8986) — реально.
- `magicuidesign/magicui` (bento-grid.tsx, bento-demo.tsx) — реально.
- `pacocoursey/cmdk` (index.tsx) и `pacocoursey/next-themes` — реально.
- `vercel/nextjs-postgres-auth-starter`, `vercel.com/kb/guide/nextjs-prisma-postgres` — реально (через поиск/доки).
- `shadcn-ui/taxonomy` (layout-группировка) — изучен структура через awesome-лист и docs.

Через курируемый список `bytefer/awesome-nextjs` отобраны 14 релевантных (не клонировались, но оценены описания):
`haydenbleasel/next-forge`, `Kiranism/next-shadcn-dashboard-starter`, `vercel/platforms`, `leerob/next-saas-starter`, `shadcn-ui/taxonomy`, `vercel/ai-chatbot`, `nextauthjs/next-auth`, `vercel/commerce`, `pmndrs/zustand`, `vercel/turborepo`, `emilkowalski/sonner`, `emilkowalski/vaul`, `theodorusclarence/ts-nextjs-tailwind-starter`, `vercel/virtual-event-starter-kit`.

Встречно упомянутые, но не разбирались глубоко (xtodo на будущее): `aceternitylabs/aceternity-ui`, `nextui-org/nextui`, `radix-ui/primitives`, `honojs/hono`, `tailwindlabs/tailwindcss`, `sveltejs/kit`, `remix-run/react-router`, `tanstack/router`, `jherr/next-route-handlers`, `mitchellhamilton/next-dashboard`, `theodorusclarence/...`.
