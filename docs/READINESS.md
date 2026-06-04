# Release Readiness — AI Strategic Academy

Дата актуализации: 2026-06-04

Этот документ — единая рабочая матрица готовности платформы. Он не заменяет подробные планы, а фиксирует текущую операционную правду: что уже доказано, что только реализовано в коде, и что блокирует production-ready статус.

## Статус

**Текущий итог:** `partial`

Последний закрытый слой: attendance actions для посещаемости курса, посещаемости урока и списка курсов преподавателя больше не раскрывают raw backend errors, не логируют controlled `ApiError` в stderr и удерживают rejected Prisma promises внутри action-boundary. Предыдущие слои закрыли super-curator actions, glossary actions, risk-management actions, student quiz/assignment actions и quiz result clients.

Платформа имеет широкий реализованный функционал и зелёный repo-local gate по последним итерациям, но production-ready статус не закрыт до сценарного proof по ролям, negative-path security proof и operational drill в целевом окружении.

## Источники статуса

| Документ | Роль |
|---|---|
| `docs/FULL-OPTIMIZATION-GOAL.md` | Долгосрочная цель полной оптимизации и доказанной работоспособности |
| `docs/READINESS.md` | Краткая матрица текущей готовности |
| `docs/release.md` | Release-hardening baseline и runbook |
| `docs/work-plan.md` | Рабочие пакеты WP0-WP6 и исторические задачи |
| `docs/full-project-audit.md` | Аудит рисков, дрейфов и доказательств |
| `docs/todo.md` | Ближайшие ручные и внешние задачи |
| `docs/updates.md` | Хронологический журнал изменений |

Если документы расходятся, приоритет такой:

1. Код и фактически выполненные проверки.
2. `docs/updates.md` для свежих событий.
3. `docs/FULL-OPTIMIZATION-GOAL.md` для верхнеуровневого Definition of Done.
4. `docs/READINESS.md` для итогового статуса.
5. `docs/release.md` и `docs/work-plan.md` для деталей.
6. Архивные документы только как исторический контекст.

## Release Work Packages

| WP | Название | Статус | Что считается выходом |
|---|---|---|---|
| WP0 | Truth Sync и агентская диспетчеризация | `done` | Роли, gates и baseline синхронизированы; контракт проверяется unit-тестом |
| WP1 | Six-role Scenario Proof | `partial` | Playwright доказывает осмысленные сценарии всех 6 ролей на seeded/disposable env |
| WP2 | Access, Privacy, Ownership Hardening | `partial` | Negative-path tests покрывают role scope, ownership, guessed IDs, observer read-only, media/report/certificate privacy |
| WP3 | Architecture Boundary Cleanup | `done` | Прямой Prisma удалён из `app/**/page.tsx` и `components/**`; guard закреплён unit-тестом |
| WP4 | Role Workspace UX Optimization | `partial` | Каждый кабинет отвечает на вопрос "что делать дальше"; есть empty/error/loading/responsive/keyboard proof |
| WP5 | Reporting, Analytics, Certificates, Notifications Proof | `partial` | Exports scoped; revoked certificates invalid; notification channel rules доказаны |
| WP6 | DevOps, Release, Backup, Observability | `blocked` | `verify:release` в целевом окружении, health checks, backup/restore, rollback, secrets и observability evidence записаны |

## Gates

| Gate | Текущий статус | Примечание |
|---|---|---|
| Banned patterns | `done` | Включён в `npm run verify` |
| Zero-warning lint | `done` | Последние записи `updates.md` фиксируют 0 errors / 0 warnings |
| TypeScript | `done` | Последние repo-local проверки зелёные |
| Unit/integration tests | `done` | Последний `npm run verify`: 850/850 Vitest tests |
| Production build | `done` | Последний `npm run verify`: production build зелёный |
| E2E smoke | `partial` | Smoke есть, но full six-role workflow proof ещё не закрыт |
| Accessibility smoke | `partial` | Axe smoke есть; full WCAG/keyboard proof не закрыт |
| Security negative paths | `partial` | Часть media/access tests закрыта; discussion post delete теперь связывает `postId` с `lessonId` из URL, assignment list scope покрывает course-level и lesson-level задания через enrollment/instructor ownership; course list API теперь использует `listCoursesForActor()`/`courseReadWhereForActor()` и published-only ограничение для student/customer_observer, leaderboard больше не глобальный для всех `courses:read` и ограничен actor scope по cohort/course/assignment/observer project; lesson visibility logging валидирует payload и проверяет `assertLearningContentAccess()` перед `logVisibilityChange()`; academy search теперь actor-scoped через `courseReadWhereForActor()` и больше не ищет глобально по всем courses/lessons, course detail route использует общий `assertCourseReadAccess()` вместо broad elevated shortcut, assignment detail GET проверяет course read scope, lesson content отделен через `assertLearningContentAccess()` от observer/reporting course scope, attendance actions используют `assertCourseAnalyticsAccess()` и не доступны student с одним `courses:read`, quiz question import теперь ограничен course scope исходных вопросов, lesson-level quiz question create/update/delete проверяют instructor course ownership и связывают `questionId` с `quizId`, assignment PATCH/DELETE fail-closed для задания без course context и используют общий instructor scope, SCORM runtime access отделен от общего course-read scope и запрещает `customer_observer` доступ к учебному SCORM-контенту, launch-start route проверяет runtime access до `createScormLaunch()` и возвращает structured `not_found`, SCORM package/import routes проверяют instructor course scope до import/read/delete и missing import file возвращает structured `bad_request`, outbox notification/report processors больше не сохраняют raw exception messages в failed event state и используют безопасные русские failure messages, SCORM serve proxy требует authenticated `courses:read`, проверяет course scope до storage access, отклоняет unsafe paths, не раскрывает raw storage errors и использует private/no-store cache для launch HTML, SCORM launch/CMI endpoints покрыты Zod validation для launch update/CMI values, structured `bad_request` для missing CMI name и no-service-call on invalid CMI payload, certificate designer preview покрыт invalid JSON/non-object payload validation и no-PDF-generation on invalid body, lesson discussion delete покрыт `courses:read` gate, Zod `postId` validation и no-service-call on invalid payload, reports download/preview/job rate-limit покрыт structured `too_many_requests` до generation/outbox enqueue, unsupported report format возвращает русский `bad_request`, users export API покрыт auth error passthrough, admin/super-curator-only gate, no raw DB error response и CSV formula/quote escaping, admin actions теперь wrap unexpected mutation errors без raw backend details, bulk import users возвращает безопасную per-row ошибку, curator/analytics actions сохраняют controlled `ApiError` без stderr-noise и wrap unexpected errors, chat/quiz-assignment actions также suppress controlled-error stderr и wrap unexpected create/read/upload errors, cron endpoints покрыты fail-closed `CRON_SECRET`, structured unauthorized/service_unavailable errors и no-raw-processor-error response, push subscribe/unsubscribe покрыт structured rate-limit, Zod validation unsubscribe payload и user-scoped endpoint deactivation, xAPI statements POST покрыт JWT/API-key boundary, Zod validation single/batch payload и пустым `204 No Content` response, visit session heartbeat/end payloads покрыты Zod validation и не трогают session/device state при некорректном payload, course-builder inline mutations теперь имеют route-level `courses:write` и Zod validation negative-path tests, redirect-target role priority и inactive-user fallback закреплены unit-тестами, public auth reset endpoints закреплены как `410 gone`, email verification покрыт token-scoped hashed rate-limit и Zod validation, 2FA login/setup-disable/status API покрыты Zod validation, per-user rate limit и structured error tests, device-session heartbeat возвращает `403` и ведёт к `/login?reason=device-limit` для отозванных устройств, lesson managed-media signed URL больше не падает в public fallback, lesson media upload сохраняет реальный managed `storageKey`, public certificate verify покрывает valid/revoked/no-private-payload, certificate revoke route требует `certificates:issue`, security notifications принудительно сохраняются несмотря на `persist: false` и disabled preferences, reports API/preview/async job/status, certificate read RBAC/list/PDF/bulk route gates, certificate designer preview, certificate PDF observer scope, report job status owner/safe-download URL, chat upload errors, popup diagnostics/targeting, cohort targeting и cohort deadline reads дополнительно ограничены server-side; весь observer/report/certificate/privacy scope ещё не доказан |
| Operational drill | `blocked` | Требует staging/production env, backup/restore/rollback evidence |

## Открытые блокеры

| Блокер | Приоритет | Где зафиксирован | Следующее действие |
|---|---|---|---|
| DPA с Vercel и Supabase не подписаны | P1 | `docs/todo.md`, `docs/legal/third-party-services-register.md` | Принять/подписать DPA до реальных production данных |
| Supabase password скомпрометирован в git history | P1 | `docs/security-review.md` | Ротация пароля вручную в Supabase Dashboard; обновить env |
| Full E2E по всем ролям | P2 | `docs/release.md`, `docs/work-plan.md` | Поднять local/disposable DB или подтверждённый staging (`ALLOW_REMOTE_DATABASE_MUTATION=true`) и расширить Playwright сценарии с действиями, а не только route smoke |
| SMTP production wiring | P2 | `docs/todo.md`, `docs/updates.md` | Настроить реальные SMTP env и delivery smoke |
| Full WCAG/keyboard proof | P2 | `docs/ux-ui-2026-audit.md` | Добавить keyboard/responsive paths для core workflows |
| Backup/restore/rollback drill | P1 | `docs/release.md`, `docs/backup-restore-runbook.md` | Провести staging drill и записать evidence |

## Правило статусов

`done` означает, что есть релевантное доказательство: code/test/browser/gate/docs/ops. Рендер страницы, зелёный build или наличие route сами по себе не закрывают продуктовый сценарий.

Для крупных изменений обновляются:

- `docs/updates.md`;
- `docs/READINESS.md`, если меняется статус gates/WP/blockers;
- `docs/release.md` или `docs/work-plan.md`, если меняется release baseline;
- `docs/ai-agent-instructions.md`, если меняется архитектурная или продуктовая правда.
