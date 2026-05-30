# Meta-Harness — методология непрерывного улучшения платформы

> **Источник:** Stanford / MIT / KRAFTON — [arXiv 2603.28052](https://arxiv.org/abs/2603.28052)
> **Авторы:** Yoonho Lee, Roshen Nair, Qizheng Zhang, Kangwook Lee, Omar Khattab, Chelsea Finn
> **Дата внедрения:** 2026-05-30
> **Статус:** Активный процесс
> **Артефакт:** [github.com/stanford-iris-lab/meta-harness-tbench2-artifact](https://github.com/stanford-iris-lab/meta-harness-tbench2-artifact)

---

## 1. Что такое Meta-Harness (оригинал)

Meta-Harness — **outer-loop система**, которая автоматически ищет оптимальную «обвязку» (harness) для LLM-приложений.

**Проблема, которую решает:** Производительность LLM-систем зависит не только от весов модели, но и от *кода* обвязки — того, что определяет, какую информацию хранить, извлекать и показывать модели. Ранее обвязки проектировались вручную, а существующие текстовые оптимизаторы сжимали обратную связь слишком агрессивно (работали только со скалярными скоров, бездиагностическими шаблонами или короткими суммариями).

**Ключевая идея:** Meta-Harness даёт **proposer-агенту** (coding agent, Claude Code с Opus-4.6) доступ к полной файловой системе, содержащей *исходный код, execution traces и скоринг* всех предыдущих кандидатов. Это позволяет proposer-у читать до **10,000,000 токенов диагностической информации** за шаг — примерно в 1000× больше, чем у предшествующих методов.

**Результаты из paper:**

| Домен | Результат |
|-------|-----------|
| Online text classification (LawBench, USPTO-50k, Symptom2Disease) | +7.7 points над ACE, **4× меньше контекстных токенов**, точность next-best метода за 4 эвалюации вместо 60 |
| Retrieval-augmented math reasoning (200 IMO-level задач) | Средний прирост **+4.7 points** на 5 held-out моделях |
| Agentic coding (TerminalBench-2, 89 Dockerized задач) | #1 среди Haiku 4.5, превзошёл Terminus-KIRA: **76.4%** pass rate на Opus 4.6 |

---

## 2. Search Loop (оригинальный алгоритм)

Meta-Harness работает в цикле **propose → evaluate → log**:

```
  ┌─────────────────────────────────────────────────────┐
  │  Файловая система D (растёт с каждой итерацией)    │
  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
  │  │ iter_01  │ │ iter_02  │ │ iter_N   │  ...      │
  │  │ source/  │ │ source/  │ │ source/  │           │
  │  │ traces/  │ │ traces/  │ │ traces/  │           │
  │  │ scores/  │ │ scores/  │ │ scores/  │           │
  │  └──────────┘ └──────────┘ └──────────┘           │
  └──────────────────────┬──────────────────────────────┘
                         │ proposer (Claude Code)
                         │ читает через grep/cat только
                         │ то, что нужно (медиана 82
                         │ файла за итерацию)
                         ▼
              ┌──────────────────────┐
              │ Diagnose → Propose   │
              │ Новый кандидат H'    │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Evaluate H'          │
              │ на search set        │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Log → store в D     │
              │ Обновить Pareto      │
              │ frontier             │
              └──────────────────────┘
```

**Формальная постановка:** Задача оптимизации обвязки — найти обвязку H, максимизирующую ожидаемый reward на дистрибуции задач X:

```
H* = argmax_H  E[ x~X, τ~pM(H,x)  r(τ, x) ]
```

**Ключевые элементы:**

1. **Proposer** — coding agent (Claude Code), решает: какие артефакты смотреть, какие failure modes адресовать, делать локальный фикс или большую переработку
2. **Filesystem** — единственный канал обратной связи: исходники, скоры, execution traces (промпты, вызовы инструментов, вывод модели, ошибки)
3. **Pareto frontier** — proposer волен смотреть любые prior кандидаты, нет parent-selection rules
4. **Search set** — proposer никогда не видит test-set, только search-set для обратной связи

**Почему это работает:** В отличие от OpenEvolve и TTT-Discover (сжимают историю в фиксированный промпт), Meta-Harness *сохраняет весь сырой опыт* в файловой системе — proposer сам решает, что и когда смотреть.

---

## 3. Адаптация для платформы (Strategic Academy)

### 3.1. Отличие от оригинального подхода

| Аспект | Оригинал (LLM harness) | Наша адаптация |
|--------|----------------------|----------------|
| **Что улучшаем** | Промпты, retrieval, memory, orchestration | Код, тесты, UX, безопасность, docs, infra |
| **Proposer** | Claude Code с Opus-4.6 | Coding AI agent |
| **Файловая система** | Итерации эволюции кандидатов | Директория `.tmp/sessions/` |
| **Обратная связь** | Execution traces, scores | Lint → typecheck → test → build → E2E |
| **Search loop** | Propose → Evaluate → Log | Scan → Prioritize → Fix → Verify → Evidence |
| **Pareto frontier** | Множество кандидатов | Разовые атомарные коммиты |

### 3.2. Search Loop для платформы

```
  ┌─────────────────────────────────────────────┐
  │  Meta-Scan: все фронты платформы            │
  │  (code, tests, UX, security, docs, infra)   │
  └──────────────────┬──────────────────────────┘
                     ▼
  ┌─────────────────────────────────────────────┐
  │  Prioritize: evidence-based приоритеты      │
  │  P0: Security & Secrets                     │
  │  P1: Testing harness, Accessibility         │
  │  P2: Performance, Code quality, Docs        │
  └──────────────────┬──────────────────────────┘
                     ▼
  ┌─────────────────────────────────────────────┐
  │  Fix: одно изменение, атомарно              │
  └──────────────────┬──────────────────────────┘
                     ▼
  ┌─────────────────────────────────────────────┐
  │  Verify: lint --max-warnings=0              │
  │          + typecheck + test + build          │
  │          + E2E smoke                         │
  └──────────────────┬──────────────────────────┘
                     ▼
  ┌─────────────────────────────────────────────┐
  │  Evidence: статус `done` только при         │
  │  code/test/browser/gate/docs/ops            │
  └──────────────────┬──────────────────────────┘
                     ▼
  ┌─────────────────────────────────────────────┐
  │  Log в docs/updates.md + коммит             │
  └──────────────────┬──────────────────────────┘
                     ▼
               ← Next iteration →
```

---

## 4. Evidence Model (доказательство завершения)

Каждый пункт итерации считается `done` только при наличии evidence из источников:

| Evidence | Что требуется |
|----------|---------------|
| **code** | Код изменён, прочитан, diff проверен |
| **test** | `vitest run` — зелёный, нет новых stderr warnings |
| **lint** | `eslint . --max-warnings=0` — 0 errors, 0 warnings |
| **typecheck** | `tsc --noEmit` — чисто |
| **browser** | Playwright smoke (хотя бы для затронутых страниц) |
| **gate** | Линт + typecheck + тест + сборка — все зелёные |
| **docs** | `docs/updates.md` обновлён |
| **ops** | Если затрагивает infra — скрипты/конфиги синхронизированы |

**Правило:** Нет evidence → статус `in_progress`. Статус `done` проставляется только после прохода всех применимых gates.

---

## 5. Original Paper: Experimental Results

### 5.1. Text Classification (online)

| Метод | Accuracy | Контекстных токенов |
|-------|----------|---------------------|
| Zero-shot | 28.5% | — |
| ACE (state-of-the-art) | 40.9% | 4× |
| **Meta-Harness (best)** | **48.6%** | **1× baseline** |
| OpenEvolve (60 proposals) | ~38% | — |
| TTT-Discover (60 proposals) | ~38% | — |

Meta-Harness достигает точности next-best метода после **4 proposals**, а не 60 — ускорение **10×**.

### 5.2. Retrieval-Augmented Math Reasoning

Ablation: что происходит, если ограничить proposer-у доступ к информации.

| Условие | Median accuracy | Best accuracy |
|---------|----------------|---------------|
| Scores only | 34.6% | 41.3% |
| Scores + summary | 34.9% | 38.7% |
| **Full filesystem (Meta-Harness)** | **выше** | **выше** |

Один обнаруженный retrieval harness улучшил точность на 200 IMO-level задачах на **+4.7 points** в среднем по 5 held-out моделям.

### 5.3. Agentic Coding (TerminalBench-2)

| Агент | Haiku 4.5 | Opus 4.6 |
|-------|-----------|----------|
| Terminus-KIRA | 35.5% | 74.7% |
| **Meta-Harness** | **37.6%** | **76.4%** |
| Goose | 35.5% | — |

Meta-Harness — **#1 среди всех Haiku 4.5** агентов и #2 среди Opus 4.6.

---

## 6. Правила работы

| Правило | Описание |
|---------|----------|
| **Ничего не ломать** | Каждое изменение проходит `lint --max-warnings=0` + `typecheck` + `test` |
| **Одна итерация за раз** | Перед переходом к следующей — verify всей текущей |
| **Evidence > intuition** | Статус `done` только при наличии доказательств (code/test/browser/gate/docs/ops) |
| **Сначала безопасность** | P0/P1 задачи имеют приоритет над новыми фичами |
| **Документация в ногу** | `docs/updates.md` и `docs/META-HARNESS.md` обновляются после каждой итерации |
| **Full scan перед стартом** | Каждая итерация начинается со скана всех фронтов |
| **Корневые причины, не симптомы** | Не чинить симптом — найти источник и устранить его |

---

## 7. Когда запускать Meta-Harness

- После любого крупного изменения (релиз, миграция, рефакторинг)
- Периодически — раз в 2-4 недели для профилактики
- При появлении новых external зависимостей
- Перед production-релизом
- Когда codebase начала «шуршать» (stderr warnings, медленные тесты, устаревшие docs)

---

## 8. Принципы для разработчиков

1. **Не оставляй мусор** — каждый PR чистит за собой (var/, логи, комменты)
2. **Тестируй негативные сценарии** — forbidden, not-found, bad-request должны быть покрыты
3. **Документируй решение** — если потратил >30 минут на баг, напиши почему и как исправил
4. **Не копируй секреты** — пароли, токены, ключи — только в env/vault, никогда в git
5. **Одна итерация — один коммит** — каждый verify-проход коммитится атомарно
6. **Полный scan перед фиксом** — не лечи симптом, найди корень
7. **Читай execution traces** — stderr и логи тестов — ценнейший diagnostic signal

---

## 9. Структура итерации (checklist)

```markdown
## Итерация X.Y: {короткое название}

**Evidence перед стартом:**
- [ ] Meta-scan всех фронтов выполнен
- [ ] Приоритеты определены

**Выполнение:**
- [ ] Fix реализован
- [ ] lint --max-warnings=0 — чист
- [ ] tsc --noEmit — чист
- [ ] vitest run — зелёный (N/M passed)
- [ ] build — зелёный

**Evidence:**
- [ ] code — diff проверен, нет секретов
- [ ] test — все тесты проходят
- [ ] lint — 0 errors, 0 warnings
- [ ] typecheck — clean
- [ ] docs — updates.md обновлён

**Коммит:** `git commit -m "Meta-Harness: {описание}"`
```

---

## 10. Ссылки

- Paper: [arXiv 2603.28052](https://arxiv.org/abs/2603.28052)
- Artifact (TerminalBench-2): [github.com/stanford-iris-lab/meta-harness-tbench2-artifact](https://github.com/stanford-iris-lab/meta-harness-tbench2-artifact)
- Авторский сайт: [yoonholee.com/meta-harness](https://yoonholee.com/meta-harness/)
- Наш план: `docs/improvement-plan.md`
- Наш журнал: `docs/updates.md`
