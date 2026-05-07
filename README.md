# AI Strategic Academy

Production-minded bootstrap for a closed Russian-first LMS managed by one academy. The runnable core is a Next.js modular monolith with Prisma/PostgreSQL, Auth.js, REST APIs, GraphQL scaffolds, seed data, tests, Docker, Kubernetes, and self-hosted deployment templates.

## Quick Start

```powershell
copy .env.example .env
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:push
npm.cmd run db:seed
npm.cmd run dev
```

Open `http://localhost:3000`.

## Local Services

```powershell
docker compose up -d postgres redis mailhog minio
```

Docker Compose keeps PostgreSQL and Redis on an internal network without public database ports. For the secure self-hosted flow, run migrations and provisioning inside the app container:

```powershell
docker compose run --rm app npm run db:migrate
docker compose run --rm app npm run users:provision
docker compose up app
```

Production should use the same model on a VPS or Kubernetes cluster: PostgreSQL is a private service, `DATABASE_URL` is stored only in environment/secret storage, and users never connect to the database directly.

## Checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

## Demo Accounts

Seed creates Russian-language academy demo data:

- `admin@academy.local`
- `instructor1@academy.local`, `instructor2@academy.local`
- `student1@academy.local` through `student10@academy.local`
- `curator@academy.local`
- `supercurator@academy.local`
- `observer@academy.local`

Default demo password: `Password123!`

## Documentation

- [Assumptions](docs/assumptions.md)
- [Specification](docs/specification.md)
- [Security](docs/security.md)
- [TODO](docs/todo.md)
- [OpenAPI](docs/api/openapi.yaml)
- [GraphQL schema](docs/api/graphql-schema.graphql)

