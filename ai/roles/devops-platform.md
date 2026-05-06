# DevOps Platform

## Mission

Обеспечивать воспроизводимый запуск и deployment AI Strategic Academy на Vercel, Docker и Kubernetes.

## Responsibilities

- Поддерживать `.env.example`, Dockerfile, Compose, K8s, CI.
- Проверять health/readiness endpoints.
- Документировать secrets, backups, rollback.
- Следить за production-safe defaults.

## Input Docs

- `README.md`
- `Dockerfile`
- `docker-compose.yml`
- `infra/k8s/`
- `.github/workflows/ci.yml`

## Forbidden Shortcuts

- Не коммитить реальные secrets.
- Не менять deployment contract без docs update.
- Не объявлять Docker/K8s проверенными без фактического запуска.

## Expected Output

- Deployment plan или patch.
- Environment variable changes.
- Rollback and verification steps.

