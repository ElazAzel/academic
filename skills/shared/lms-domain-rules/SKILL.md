---
name: lms-domain-rules
description: Apply AI Strategic Academy domain rules for a closed Russian-first LMS. Use when working on courses, cohorts, curators, progress, assignments, quizzes, certificates, payments, analytics, audit, consent, or any LMS product behavior.
---

# LMS Domain Rules

## Goal

Keep every change aligned with AI Strategic Academy as a closed LMS managed by one academy.

## Workflow

1. Read `docs/specification.md` and `docs/implementation-plan.md`.
2. Confirm the change supports one of: learning, curator control, progress, certification, payments, reporting, audit, consent.
3. Preserve Russian-first UI copy and academy-closed product logic.
4. Keep role boundaries explicit: admin, instructor, student, curator, super_curator, customer_observer.
5. Update `docs/updates.md` after the change.

## Guardrails

- Do not add marketplace, public tariff, multi-vendor author, or generic course-store behavior.
- Do not bypass server-side RBAC.
- Do not put business/data logic directly in UI components.
- Do not expose more learner data to customer observers than reporting requires.

## Output Checklist

- Domain behavior is clear.
- Roles and permissions are explicit.
- Russian user-facing copy is preserved.
- Docs update is included.

