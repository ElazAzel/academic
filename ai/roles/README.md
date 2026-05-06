# AI Roles For AI Strategic Academy

Эта папка описывает специализированные роли для AI-агентов, которые работают над проектом. Роли не заменяют `docs/specification.md`, `docs/security.md` и `docs/implementation-plan.md`; они задают рабочую перспективу агента.

## Как использовать

1. Выбрать роль под задачу.
2. Прочитать role-файл целиком.
3. Прочитать обязательные input docs из role-файла.
4. Выполнить задачу в границах роли.
5. Обновить `docs/updates.md`; если меняется статус задач, обновить `docs/implementation-plan.md`.

## Роли

| Role file | Назначение |
|---|---|
| `orchestrator.md` | Декомпозиция, координация, контроль статусов |
| `product-owner.md` | Продуктовая логика LMS и приоритеты |
| `principal-architect.md` | Архитектура, границы модулей, долгосрочная масштабируемость |
| `backend-next-prisma.md` | Backend, REST, Prisma, Auth.js, server modules |
| `frontend-lms-ux.md` | UI/UX, доступность, русская LMS-навигация |
| `security-privacy.md` | Security, privacy, RBAC, audit, consent |
| `qa-release.md` | Тестирование, release gates, regression |
| `devops-platform.md` | CI/CD, Docker, Kubernetes, Vercel |
| `data-analytics.md` | Аналитика, отчёты, цифровой след |
| `technical-writer.md` | Документация, changelog, implementation plan |

