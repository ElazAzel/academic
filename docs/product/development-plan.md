# Development Plan — AI Strategic Academy

> Дата: 2026-06-16
> Статус: active

---

## Context

Платформа прошла Stages 1–6 (product docs → productivity score → final project → survey → reports → UX).  
Текущий baseline: **933 тестов, production build, чистый typecheck**.

Следующая фаза — **Commercial Product**: платформа должна быть готова к продаже AI Productivity Bootcamp корпоративным клиентам.

---

## Треки

### 🟢 Track A: Операционная готовность

| # | Задача | Сложность | Статус |
|---|--------|:---------:|:------:|
| A1 | Починить CI — E2E quiz (403 sequential unlock) + accessibility flaky test | 🟡 | ⬜ |
| A2 | CSP: `'self'` в `script-src` для чанков на `/student` | 🟢 | ⬜ |
| A3 | E2E smoke по 6 ролям (admin, student, curator, instructor, super_curator, observer) | 🟡 | ⬜ |
| A4 | SMTP production wiring | 🟢 | ✅ |

### 🔵 Track B: Коммерческие фичи

| # | Задача | Сложность | Статус |
|---|--------|:---------:|:------:|
| B1 | Weekly Cohort Report (по шаблону `customer-report-template.md`) | 🔴 | ✅ |
| B2 | Final Cohort Report (итоговый отчёт со Score, NPS, артефактами) | 🔴 | ✅ |
| B3 | Observer: Productivity Score distribution по потоку | 🟡 | ✅ |
| B4 | Onboarding Flow: admin workflow «клиент → поток → импорт студентов» | 🔴 | ⬜ |

### 🟣 Track C: Release Readiness

| # | Задача | Сложность | Статус |
|---|--------|:---------:|:------:|
| C1 | Backup/restore drill | 🟡 | ⬜ |
| C2 | Security negative-path completion (WP2) | 🔴 | ⬜ |
| C3 | Production deploy runbook (`verify:release` в staging) | 🟢 | ⬜ |

---

## План по неделям

```
Неделя 1: A1 + A2 + A3    (CI, CSP, E2E smoke)
Неделя 2: B1 ✅           (Weekly Report)
Неделя 3: B2 ✅ ✅        (Final Report)
Неделя 4: B3 ✅ + A4 ✅   (Score для observer + SMTP) — ✅ сделано
Далее:    B4 / C1 / C2    (Onboarding / Backup / Security)
```

## Критерии готовности треков

- **Track A**: CI зелёный, CSP не блокирует страницы, E2E smoke проходит, SMTP отправляет письма
- **Track B**: Weekly/Final Report генерируются через ReportDesigner, Observer видит Score, Admin может создать поток и импортнуть студентов
- **Track C**: `verify:release` проходит в staging, backup/restore подтверждён, security negative-path доказан

## Связанные документы

- `docs/READINESS.md` — матрица release-ready статуса
- `docs/release.md` — release-hardening baseline
- `docs/product/customer-report-template.md` — шаблоны отчётов
- `docs/product/pricing.md` — тарифы и воронка
- `docs/product/success-metrics.md` — целевые метрики
