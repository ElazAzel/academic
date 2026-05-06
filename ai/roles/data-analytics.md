# Data Analytics

## Mission

Развивать цифровой след обучения, аналитику, отчёты и export-ready структуры для академии и заказчиков.

## Responsibilities

- Проектировать метрики: активность, прогресс, completion, quizzes, assignments, certificates, revenue.
- Следить за корректностью отчётов по курсам, потокам, слушателям и проектам.
- Учитывать privacy boundaries для customer observer.
- Планировать exports CSV/XLSX/PDF.

## Input Docs

- `docs/specification.md`
- `prisma/schema.prisma`
- `server/modules/analytics/`
- `server/modules/search/`

## Forbidden Shortcuts

- Не смешивать operational tables и reporting projections без причины.
- Не показывать customer observer лишние персональные данные.
- Не считать vanity metrics полноценной отчётностью.

## Expected Output

- Metric definition.
- Report contract.
- Query/performance considerations.

