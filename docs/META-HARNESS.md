# Meta-Harness — операционный протокол непрерывного улучшения

> **Источник подхода:** Stanford / MIT / KRAFTON — [arXiv 2603.28052](https://arxiv.org/abs/2603.28052)
> **Артефакт:** [github.com/stanford-iris-lab/meta-harness-tbench2-artifact](https://github.com/stanford-iris-lab/meta-harness-tbench2-artifact)
> **Дата внедрения:** 2026-05-30
> **Дата актуализации протокола:** 2026-06-02
> **Статус:** активный процесс

Meta-Harness для AI Strategic Academy — это не отдельная фича и не замена release-плана. Это дисциплина работы: каждое улучшение начинается с доказуемого контекста, заканчивается evidence, а весь опыт сохраняется так, чтобы следующая итерация не начиналась с нуля.

## 1. Оригинальная идея

Оригинальный Meta-Harness оптимизирует LLM harness: код, который решает, какую информацию хранить, извлекать и показывать модели. Вместо короткого summary proposer-агент получает доступ к файловой системе с исходниками, scores и execution traces предыдущих кандидатов.

Важные идеи, которые переносим в проект:

- сохранять сырой опыт, а не только финальное резюме;
- давать агенту возможность самому выбирать релевантные артефакты;
- оценивать изменения через gates, а не через впечатление;
- разделять рабочий search set и финальный holdout/release gate.

## 2. Адаптация для Strategic Academy

| Аспект | Оригинал | Наша адаптация |
|---|---|---|
| Что улучшаем | Prompt/retrieval/memory/orchestration harness | Код, тесты, UX, безопасность, документацию, infra |
| Proposer | Coding agent | AI/coding agent или разработчик |
| История опыта | Source, traces, scores предыдущих harness-кандидатов | `docs/updates.md`, `docs/READINESS.md`, session artifacts, test logs, diffs |
| Search set | Набор задач для итеративной обратной связи | Scoped checks: lint/typecheck/unit/build/targeted Playwright |
| Holdout gate | Скрытый test set | `npm run verify:release` на staging + six-role scenarios + ops drill |
| Pareto frontier | Лучшие кандидаты | Проверенные атомарные изменения и отклонённые гипотезы с причинами |

## 3. Источники истины

Перед крупной итерацией читать в таком порядке:

1. `docs/READINESS.md` — текущий итоговый статус.
2. `docs/updates.md` — свежие изменения сверху вниз.
3. `docs/release.md` — release-hardening baseline и gates.
4. `docs/work-plan.md` — WP0-WP6 и текущие рабочие пакеты.
5. `docs/full-project-audit.md` — риски, дрейфы, блокеры.
6. `docs/platform-functional-overview.md` — продуктовая логика без технических деталей.
7. `docs/ai-agent-instructions.md` — hard rules для агентов.

Если документы расходятся:

1. Проверить фактический код и последние gates.
2. Локализовать drift.
3. Исправить источник статуса или явно зафиксировать расхождение.
4. Не повышать статус до `done` без evidence.

## 4. Цикл итерации

```text
Scan -> Prioritize -> Fix -> Verify -> Evidence -> Log -> Next
```

### 4.1 Scan

Скан бывает двух уровней:

| Тип | Когда применять | Что входит |
|---|---|---|
| Scoped scan | Обычная задача, багфикс, локальная фича | Затронутые docs/code/tests, недавние `updates.md`, релевантные gates |
| Full meta-scan | Перед релизом, после миграции, после крупного refactor, раз в 2-4 недели | Code, tests, UX, security, docs, infra, release gates, blocker register |

Полный скан перед каждым мелким фикс-PR не требуется: он создаёт шум и замедляет delivery. Но отсутствие scoped scan перед изменением — нарушение протокола.

### 4.2 Prioritize

Приоритеты:

| Уровень | Смысл |
|---|---|
| P0 | Секреты, доступ, data leak, build breaker, потеря данных |
| P1 | Core learning flow, RBAC, certificate/report/privacy proof, operational release blockers |
| P2 | Accessibility, performance, UX role-workspaces, docs drift |
| P3 | Scale extraction, polish, strategic extensions |

Новые фичи не должны обгонять WP1/WP2/WP6, если они увеличивают release risk.

### 4.3 Fix

Одна итерация должна быть атомарной:

- один понятный outcome;
- минимальный затронутый blast radius;
- без побочных refactor, если они не нужны для результата;
- без изменения статусов в документах "на будущее".

### 4.4 Verify

Минимальный gate выбирается по риску:

| Изменение | Минимальная проверка |
|---|---|
| Только docs | Link/path sanity + review diff |
| Server/business logic | `npm run typecheck`, targeted unit tests, при риске — `npm run verify` |
| UI/route | `npm run lint`, `npm run typecheck`, targeted Playwright/accessibility smoke |
| Auth/RBAC/privacy/certificates/reports | Targeted negative tests + `npm run verify` |
| Release candidate | `npm run verify:release` в целевом окружении |

`npm run verify` остаётся стандартным repo-local gate перед утверждением code-ready статуса. `npm run verify:release` нужен для release-ready, если есть staging/disposable env.

### 4.5 Evidence

Статус `done` разрешён только при evidence:

| Evidence | Что требуется |
|---|---|
| code | Diff проверен, нет секретов, blast radius понятен |
| lint | 0 errors / 0 warnings, если затронут код |
| typecheck | TypeScript clean, если затронут TS/TSX |
| test | Unit/integration/negative tests покрывают заявленное поведение |
| browser | Playwright/browser smoke для затронутых пользовательских путей |
| gate | `npm run verify` или `verify:release`, когда применимо |
| docs | `docs/updates.md` обновлён; `READINESS.md` обновлён при смене статуса |
| ops | Env, backup, deploy, rollback, monitoring evidence записаны при infra/release изменениях |

Нет evidence -> статус `partial` или `in_progress`.

### 4.6 Log

Каждая значимая итерация обновляет `docs/updates.md`. Если меняется готовность платформы, обновляется `docs/READINESS.md`. Если меняется release baseline, обновляются `docs/release.md` и `docs/work-plan.md`.

## 5. Session Artifacts

Для крупных итераций создаётся директория:

```text
.tmp/sessions/YYYY-MM-DD-{slug}/
```

Рекомендуемая структура:

```text
scan.md           # что просмотрено и почему
hypotheses.md     # возможные причины/решения
decision.md       # выбранный подход и tradeoffs
commands.log      # команды и краткий результат
evidence.json     # machine-readable evidence
diff-summary.md   # изменённые файлы и смысл diff
followups.md      # что осталось, без повышения статуса
```

`var/`, секреты, персональные данные и raw production logs туда не складываются.

## 6. Noise Policy

Meta-Harness ценен только если signal-to-noise в gate output остаётся высоким.

- Ожидаемые domain-denials (`ApiError` с `400/401/403/404/422`) не должны писаться в `console.error` из action/route catch-блоков. Они являются проверяемым поведением, а не аварией.
- Неожиданные infrastructure/persistence errors логируются серверно с техническим label, но наружу возвращают безопасный русскоязычный `internal_error` без raw message, stack, connection string или secrets.
- Negative-path tests, которые намеренно создают internal error, должны проверять no-leak контракт и при необходимости глушить `console.error` через spy, чтобы не загрязнять общий `npm run verify`.
- Если stderr остаётся после зелёного gate, его нужно классифицировать: expected diagnostic, test harness noise, или production-risk log. Последние два класса закрываются отдельной итерацией.

## 7. Redaction Policy

В session artifacts, docs и logs запрещено сохранять:

- реальные пароли, API keys, tokens, cookies, connection strings;
- Supabase service keys и полные `DATABASE_URL`;
- email/телефоны реальных пользователей, если они не обезличены;
- файлы заданий студентов и приватный учебный контент;
- PDF сертификатов с персональными данными;
- raw production request logs без очистки IP/user-agent/session identifiers.

Допустимые формы:

- `REDACTED`;
- `user@example.invalid`;
- `student-001`;
- последние 4 символа идентификатора только если это нужно для отладки.

## 8. Release-Hardening Alignment

Meta-Harness не повышает release status сам по себе. Статусы берутся из `docs/READINESS.md`.

Текущие ключевые блоки:

- WP1: full six-role scenario proof;
- WP2: access/privacy/ownership negative paths;
- WP4: role workspace UX proof;
- WP5: reports/certificates/notifications proof;
- WP6: staging release drill, backup/restore/rollback, secrets, observability.

Стратегические фичи из `MASTER-PLAN.md` и `scale-path.md` выполняются только после стабилизации core truth, если не закрывают release blocker напрямую.

## 9. Checklist итерации

```markdown
## Итерация: {название}

**Scope**
- [ ] Цель сформулирована одним outcome
- [ ] Scoped/full scan выполнен
- [ ] Blast radius определён

**Implementation**
- [ ] Изменение реализовано атомарно
- [ ] Секреты/PII не добавлены
- [ ] Empty/error/loading states учтены, если есть UI

**Verification**
- [ ] Минимальные targeted checks выполнены
- [ ] `npm run verify` выполнен или явно не применим
- [ ] Browser/Playwright smoke выполнен или явно не применим

**Evidence**
- [ ] Diff проверен
- [ ] `docs/updates.md` обновлён
- [ ] `docs/READINESS.md` обновлён, если изменился статус
- [ ] Follow-ups записаны без ложного `done`
```

## 10. Ссылки

- Paper: [arXiv 2603.28052](https://arxiv.org/abs/2603.28052)
- Artifact: [github.com/stanford-iris-lab/meta-harness-tbench2-artifact](https://github.com/stanford-iris-lab/meta-harness-tbench2-artifact)
- Текущая готовность: `docs/READINESS.md`
- Release baseline: `docs/release.md`
- Рабочий план: `docs/work-plan.md`
- Журнал: `docs/updates.md`
