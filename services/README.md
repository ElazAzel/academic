# Microservices Reference Architecture

The modular monolith is the primary runnable implementation. These services are extraction targets when traffic, team ownership, or independent scaling require separation.

## Boundaries

- `gateway-bff`: public API gateway, request auth, aggregation, frontend-facing contracts.
- `auth-service`: identity, sessions, roles, permissions, consent.
- `course-service`: courses, modules, lessons, media, cohorts.
- `assessment-service`: quizzes, questions, assignments, submissions.
- `progress-certificate-service`: progress, risk detection, certificate issuance.
- `billing-service`: deprecated extraction target. Current academy profile is invite-only; payment routes stay as `410 Gone` compatibility endpoints.
- `notification-service`: email, push, in-app notifications, templates.
- `analytics-reporting-service`: dashboards, exports, audit/report views.

## Communication

- Synchronous: REST between gateway and domain services.
- Asynchronous: outbox events for enrollment, invite activation, progress, certificate, and notification flows.
- Data ownership: each service owns its database schema after extraction; the monolith remains the source during MVP.

## Migration Strategy

1. Add outbox tables to the monolith.
2. Publish domain events without changing user-facing behavior.
3. Extract notification and analytics first.
4. Extract invite access only when lifecycle limits, audit trail, and support workflows need independent ownership.
5. Extract course/progress only when independent scaling is necessary.
