# Оркестрация ИИ-агентов: паттерны для гейтов качества и безопасности

Отчёт по изучению open-source агентских систем. Цель — конкретные паттерны
для проекта «AI Strategic Academy»: гейты текста (humanizer-ru) и
security-ревью перед коммитом/выдачей, плюс наблюдаемость прогонов.

## 1. Структура скиллов, агентов и субагентов

**Единый стандарт `SKILL.md`.** Спецификация Agent Skills (Anthropic) принята
Codex CLI, Gemini CLI, Cursor, Copilot, OpenCode, Windsurf. Один `SKILL.md` с
YAML-frontmatter (`name`, `description`, опц. `license`, `compatibility`,
`metadata`) + опц. папки `references/`, `scripts/`, `examples/`.

Правила из `awesome-claude-skills` / `mingrath/awesome-claude-skills`:
- **Одна ответственность.** Скилл делает одно. `deploy` деплоит, `test-gen`
  генерит тесты. Не смешивать.
- **SKILL.md < 500 строк.** Детали и длинные примеры — в `references/`,
  грузятся по требованию (progressive disclosure). Это экономит контекст.
- **Описание = механизм обнаружения.** Модель видит только `name`+`description`
  в каталоге скиллов; без точного `description` скилл не подгрузится.
- **Контрасты через `$ARGUMENTS`** для аргументов и `{file:./path}` для
  подстановки live-данных.
- **Сайд-эффекты** (deploy, publish) помечать `disable-model-invocation: true`,
  чтобы модель не триггерила сама.

**Агенты (opencode `agent`):** `mode: primary|subagent|all`, `model`,
`temperature`, `prompt`, `tools`, `permission`. OpenCode-нюанс (issue #28879):
`loadMode` жёстко ставит `mode:"primary"`, затирая `subagent`. Пока не
починят — субагентов (`text-humanizer`, `security-guard`) держать только в
`opencode.json`, без отдельных mode-файлов.

**Делегирование (Totalum playbook, `georgernstgraf/opencode-helpers`):**
- Skill учит *как*, Hook *запрещает*, Subagent *изолирует* работу. Триада.
- Один субагент = один скоуп работы, свой контекст, свои права, своя модель.
  Лид видит только итоговое резюме.
- `orchestrator`-паттерн: главный агент не пишет код, только декомпозит и
  верификацию; реализация — Task-агентам с полным контекстом в промпте
  (файлы, конвенции, питфоллы, команды тестов, критерий завершения).

## 2. References и MCP для внешних источников

- **`references` в opencode.json** (уже используется: `humanizer-ru`,
  `owasp-top10`) — лучший паттерн для локальных источников. Модель читает
  файл, когда скилл велит, а не грузит весь контекст сразу.
- **MCP** (`modelcontextprotocol`): `.mcp.json` уже есть (supabase). Транспорт
  `http`/`sse`/`stdio`. Тулы MCP требуют явного разрешения
  (`permission: mcp__server__*`); предпочтительнее `allowedTools`-маска, чем
  широкий `bypassPermissions`.
- **`skill://` (SEP-2640, MCP):** скиллы как ресурсы поверх MCP — актуально,
  если humanizer/owasp будем раздавать как сервер. Имя скилла должно быть
  уникальным в пределах сервера (инвариант коллизий).
- **Риск:** MCP-серверы, тянущие внешний контент, — вектор prompt injection
  (docs.claude.com/mcp). Доверяй сервер до подключения; сужай права тулов.

## 3. Оркестрация гейтов: humanizer + security перед коммитом/выдачей

Механический гейт > мягкое «напоминание в промпте» (именно так в проекте
сейчас — через `instructions`). Паттерны:

- **PreToolUse-хук на `git commit`** (Claude Code hooks, `imti.co/pre-commit-
  review-gate`, `takahirom/claude-code-quality-gate`, `blakecrosley`): скрипт
  перехватывает вызов, запускает adversarial-субагента по diff, блокирует
  (`exit 2`), пока нет артефакта `Verdict: CLEAN`. В opencode это аналог —
  `permission`/`hooks` в `opencode.json`. Ключ: хук должен *возвращать причину
  блокировки в контекст агента*, чтобы тот сам перезапустил ревью.
- **Качественный бар находок:** конкретный дефект с `file:line`, а не «можно
  чище». Стиль/доки — в отдельный раздел `Suggestions`, не блокируют вердикт.
- **Итерационный лимит:** 2 раунда обычно, 3 — только если нашли реальный баг;
  иначе diff слишком велик и его надо дробить (size-warn-хук > 800 строк).
- **Fails-closed:** таймаут/падение гейта = блок, не пропуск (но `claude`/
  бинарь не найден — fail-open, иначе новый репозиторий застрянет).
- **humanizer-гейт:** перед выдачей текста запускать `text-humanizer`-
  субагента с чеком HARD BANS + burstiness; вердикт как артефакт. Тот же
  механизм, что у security, но триггер — `MessageDisplay`/выдача, не коммит.
- **Детерминированный вердикт кодом, не дискрецией модели** (`claude-code-
  review-gate`): severity/confidence → `block|warn|pass`, решает аудируемый
  скрипт. Falsify-проход: второй субагент сбрасывает находку только при
  прямом контр-свидетельстве.

## 4. Как избежать гомогенизации и деградации при многократных прогонах

Исследования (RAGEN-2, arxiv 2604.06268; Mode Collapse, arxiv 2605.00435;
MAS Diversity, ACL 2026) показывают: накопленное регулирование (KL/entropy)
стирает различия между входами — reasoning становится input-agnostic, хотя
выглядит разнообразным. Признаки: текст «под одну гребёнку», одни и те же
шаблоны формулировок.

Конкретные меры:
- **Не полагаться на temperature=0.** Грити-декодинг вырождается в петли и
  клише (arxiv 2606.08998). Для творческого/текстового гейта — умеренная T
  + repetition/top-p penalty, либо **стратификация** (SimpleStrat, arxiv
  2410.09038): модель сама делит пространство ответов на страты, случайная
  страта → разнообразие без потери качества.
- **Разные модели на разные роли.** Ревью-субагент на дешёвой/быстрой модели
  (haiku-класс) даёт независимый взгляд и режет cost-surprise (Totalum).
- **Свежий контекст на каждый прогон.** SubagentStop-хуки и отдельные
  сессии субагентов не засоряют лид-транскрипт шаблонами прошлых итераций.
- **Mutual Information как диагностика** (RAGEN-2): если reasoning не зависит
  от входа — template collapse. Признак для метрики качества гейта.
- **Не превращать гейт в театр ревью.** Промпт-шаблон — принуждение
  (обязательные секции вывода, пустая секция видна), а не «проверь качество».

## 5. Логирование и наблюдаемость агентных прогонов

- **OpenTelemetry GenAI SemConv v1.41** (CNCF) — 2026-стандарт. Шесть слоёв:
  LLM-вызов, оркестрация агента, MCP-тулы, workflow, content-capture, eval-
  оценка. Все серьёзные бэкенды (Langfuse, Arize, Datadog, Bedrock) едят
  OTLP — смена бэкенда = переменная окружения, не реинструментация.
- **Структура трейса:** run (span) → trace (дерево run'ов) → thread (много
  туров) → trajectory (плоский список сообщений). Атрибуты:
  `gen_ai.agent.name/id`, `gen_ai.request.model`, `usage.input/output_tokens`,
  `usage.cost`, `tool.name/arguments/result`.
- **Инструментировать на уровне фреймворка**, не приложения. OTel Collector
  буферизирует, пока не выбран бэкенд (fanout).
- **Для opencode-проекта:** Sentry уже подключён (`instrumentation.ts`) —
  расширить span'ами агентных шагов; писать артефакты гейтов (verdict, diff
  hash) в `outputs/` или `var/`, чтобы трейс и вердикт лежали рядом.
- **Content-capture только в staging** (PII/секреты в промптах). Прод —
  privacy-by-default.
- **Гейт ↔ eval в одном графе:** verdict гейта крепить к трейсу как score-
  атрибут (v1.41). Alerting по латентности/стоимости/распределению finish-
  reason — с первого дня прод-трафика.

## Репозитории, изученные через web/docs

- `opencode-ai/opencode` — docs (skills, agents, v2 config, issue #28879)
- `anthropics/claude-code` — hooks guide, MCP, sub-agents, plugin-dev skills
- `Aider-Aider/aider` — (в обзорах паттернов; не читал исходник напрямую)
- `All-Hands-AI/OpenHands` — (в обзорах агентных рантаймов)
- `openai/codex` — Agent Skills spec, loader (recursive ≤6), injection
- `e2b-dev/e2b` — `awesome-ai-agents` список
- `microsoft/autogen` — (в обзорах multi-agent)
- `langchain-ai/langchain` + `langfuse` — observability/OTel docs
- `crewAIInc/crewAI` — (в обзорах; OTel-инструментация)
- `jsonheroio/jsonhero` — (в списках; не читал глубоко)
- `modelcontextprotocol/servers` + SEP-2640 `skill://`
- `anthropics/anthropic-cookbook` — (в обзорах)
- `yoheinakajima/babyagi` — (в списках архитектур)

Awesome-списки (10–15 релевантных):
`github/awesome-copilot`, `VoltAgent/awesome-agent-skills`,
`heilcheng/awesome-agent-skills`, `philipbankier/awesome-agent-skills`,
`seb1n/awesome-ai-agent-skills`, `mingrath/awesome-claude-skills`,
`hesreallyhim/awesome-claude-code`, `ComposioHQ/awesome-claude-skills`,
`rohitg00/awesome-claude-code-toolkit`, `e2b-dev/awesome-ai-agents`,
`jim-schwoebel/awesome_ai_agents`, `punkpeye/awesome-mcp-servers`,
`officialskills.sh` (marketplace), `awesomeclaude.ai`.

Конкретные гейт-реализации (паттерны скопированы в §3):
`imti.co/pre-commit-review-gate`, `takahirom/claude-code-quality-gate`,
`Jose-Ribeir/claude-code-review-gate`, `blakecrosley` hooks tutorial,
`fallow` audit gate, `georgernstgraf/opencode-helpers` (orchestration skill),
`Totalum` subagents playbook.
