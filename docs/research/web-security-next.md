# Web-security для «AI Strategic Academy»

Стек: Next.js 16 (App Router) + Auth.js v5 + Prisma/Postgres. Ниже — конкретные
паттерны из изученных OSS-репозиториев, разложенные по OWASP Top 10:2025.

## 1. RBAC / ABAC и защита роутов (A01 Broken Access Control)

В App Router единая точка проверки — `proxy.ts` (в Next 16 `middleware` переименован
в `proxy`, функция — в `proxy`). Коарузную аутентификацию ставим там, тонкую
авторизацию — в layout / server component, потому что на Edge-рантайме нет доступа
к БД и кастомной логике ролей.

Auth.js v5 (`auth.ts`):
```ts
callbacks: { authorized: async ({ auth }) => !!auth } // редирект, если нет сессии
```
```ts
// proxy.ts
export { auth as proxy } from "@/auth";
export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
```
Роли и права — на стороне данных. Better Auth даёт готовый RBAC через
`createAccessControl` + плагин `organization`/`admin`:
```ts
const ac = createAccessControl({ project: ["create","update","delete"] } as const);
const admin = ac.newRole({ project: ["create","update","delete"] });
// auth.api.hasPermission({ body: { permissions: { project: ["create"] } } })
```
Layout-guard (server component) читает сессию и кидает `notFound()`/`redirect()`,
если роли нет — UI-прятанье не считается защитой (A01).
ABAC в Better Auth нативно нет (issue #2167 закрыт); для атрибутов (тариф,
владелец) — свои проверки в action/loader либо `better-auth-abac`, либо Permit.io.

## 2. CSP с per-request nonce (A05 XSS, A02 Misconfiguration)

Nonce нельзя задать в `next.config` — он должен меняться на каждый запрос, иначе
он равен `unsafe-inline`. Генерим в `proxy.ts`, прокидываем и в request-, и в
response-заголовок (Next читает nonce из request-заголовка и вешает его на свои
скрипты), а в layout достаём через `headers()`.

```ts
const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
  style-src 'self' 'nonce-${nonce}'; object-src 'none'; frame-ancestors 'none';
  base-uri 'self'; form-action 'self'; upgrade-insecure-requests;`;
requestHeaders.set("x-nonce", nonce);
response.headers.set("Content-Security-Policy", csp);
```
```ts
// layout.tsx
const nonce = (await headers()).get("x-nonce")!;
<Script src="..." strategy="afterInteractive" nonce={nonce} />
```
Важно: чтение `headers()` переводит роут в динамический рендеринг (цена nonce) —
статику под CSP подписывать хэшами. Статичные директивы (HSTS, nosniff,
`frame-ancestors`, `referrer-policy`) класть в `next.config` `headers()`. Сначала
включить `Content-Security-Policy-Report-Only`, собрать нарушения, потом — enforce.
`helmet` для Next не годится (это Express); берём заголовки вручную либо
`csp-toolkit` / `nextjs-security-headers`.

## 3. Сессии и инвалидация (A07 Authentication Failures)

Для мгновенного отзыва сессий нужны БД-сессии, а не только JWT. Auth.js v5 —
Prisma adapter (`@auth/prisma-adapter`), стратегия `database`. Logout и смена пароля
должны уничтожать строку сессии / все сессии пользователя.

Better Auth то же самое явно:
```ts
await auth.api.revokeSession({ body: { token }, headers });
await auth.api.revokeOtherSessions({ headers }); // после смены пароля
```
Cookie: `Secure` + `HttpOnly` + `SameSite=Lax`, короткий `maxAge`, ротация при
привилегированных действиях. Единая проверка сессии — в `proxy` и в корневом
layout, а не размазанная по handlers.

## 4. Серверная валидация и защита server actions (A05, A06)

Клиентская валидация — только UX. На сервере вход всегда прогоняем через Zod
(или Valibot/ArkType через Standard Schema). `next-safe-action` оборачивает
server action: схема входа, цепочка `.use()`-мидлваров, типизированный результат
`{ data, validationErrors, serverError }`.

```ts
export const authAction = createSafeActionClient({ handleServerError(e){
  return e instanceof ActionError ? e.message : "Что-то пошло не так";
}}).use(async ({ next }) => {
  const s = await auth(); if (!s?.user?.id) throw new ActionError("Нет доступа");
  return next({ ctx: { userId: s.user.id } });
});
export const createProject = authAction
  .schema(z.object({ title: z.string().min(3) }))
  .action(async ({ parsedInput, ctx }) => { /* DB через ctx.userId */ });
```
`handleServerError` не пускает стектрейсы и ошибки БД к клиенту (A09). Те же Zod-
схемы дублируем на API routes (`app/api/**`) — middleware не заменяет проверку у
самого запроса к данным.

## 5. Rate limiting, аудит зависимостей, секреты (A03/A04/A06)

- Rate limiting + bot + WAF: Arcjet (`@arcjet/next`) — `arcjet({ key: "ip" })` с
  `shield()`, `slidingWindow()`, `botProtection()`. Ставить в `proxy` и в action.
- Зависимости: `npm audit --omit=dev` в CI, Dependabot/Renovate, `package-lock.json`
  коммитится. Новые пакеты — только с обоснованием. Доп. стат-анализ: Semgrep.
- Секреты: валидируем env через `@t3-oss/env-nextjs` + Zod; `NEXT_PUBLIC_*` — только
  несекретное. `.env*` в `.gitignore`, сканируем коммиты `gitleaks`/`trufflehog`.
  Service-role ключ Prisma — только на сервере, никогда в бандле (grep по
  `NEXT_PUBLIC` и `service_role`).

## Что изучено

Из указанного: nextauthjs/next-auth (v5 → `auth()`/`authorized`, proxy.ts),
better-auth/better-auth (RBAC, organization/admin, revoke sessions),
lucia-auth/lucia (deprecated с марта 2025 — не брать; Osmo/Arctic живы),
supertokens/supertokens-core, clerk/clerk-sdk-node (CSP-гайд),
next-safe-actions/next-safe-actions (v7 middleware), colinhacks/zod,
helmetjs/helmet (только Express), OWASP/owasp (CheatSheetSeries/ASVS),
nodejs/security-wg, vercel/security, pilcrowonpaper/oslo (примитивы сессий),
auth0/auth0-js.

Из awesome-web-security (qazbnm456) и смежного — 15 релевантных:
cure53/H5SC, cure53/HTTPLeaks, swisskyrepo/PayloadsAllTheThings, OWASP/CheatSheetSeries,
OWASP/ASVS, returntocorp/semgrep, gitleaks/gitleaks, trufflesecurity/trufflehog,
arcjet/arcjet, next-safe-action/next-safe-action, better-auth/better-auth,
pilcrowonpaper/oslo, helmetjs/helmet, vercel/security, nodejs/security-wg.
