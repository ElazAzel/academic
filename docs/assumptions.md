# Assumptions

- Flags: `--stack=nextjs`, `--primary-stack=nextjs`, `--mode=full`, `--arch=both`, `--api=both`, `--deploy=all`, `--locale=ru`, `--profile=academy-ru-closed`, `--full-all=false`.
- Existing `info.md` and `info — копия.md` are preserved as source/reference documents and are not edited.
- Primary implementation is a modular monolith. Microservices are reference runnable scaffolds with contracts and tests.
- Next.js `16.2.5`, React `19.2.4`, Prisma `6.16.2`, and NextAuth `4.24.11` are pinned for repeatable installs.
- `.npmrc` enables `legacy-peer-deps=true` because NextAuth stable `4.24.x` has a peer range that does not yet include Next `16`, while the project intentionally targets the current Next.js line. Replace this with Auth.js v5+ once the stable adapter path is accepted.
- PostgreSQL is the system of record. Redis, MailHog, and MinIO are local development dependencies from Docker Compose.
- Vercel deployments use managed PostgreSQL through `DATABASE_URL`; migrations and seed must run after Production/Preview env vars are set.
- Russian is the default UI locale. English dictionary scaffolding is not generated because `--locale=ru`.
- Theme default is light and academy-focused. The app avoids marketplace pricing pages and multi-vendor course author flows.
- Certificate issuance defaults to 85% course completion plus accepted final assignment. The threshold is configurable through `CERTIFICATE_COMPLETION_THRESHOLD`.
- The current academy profile is invite-only. Stripe/payment providers are deprecated for this branch; payment routes stay for backward compatibility and return `410 Gone`. SMTP, OAuth, S3, and push providers are configured through env vars only; no secrets are committed.
- Passwords use Argon2id hashing through `@node-rs/argon2`.
- REST is implemented as the primary API. GraphQL is a schema/resolver scaffold behind `FEATURE_GRAPHQL`.
- PostgreSQL full-text search is the MVP search engine. The repository boundary allows replacing it later.
- File uploads are represented through S3-compatible storage metadata. Direct multipart upload endpoints are documented as next production hardening.
- Docker runtime verification depends on local Docker CLI availability.
- The GitHub repository `ElazAzel/academic` was treated as intended remote context, but the local folder is bootstrapped from scratch because it was not a git checkout.
