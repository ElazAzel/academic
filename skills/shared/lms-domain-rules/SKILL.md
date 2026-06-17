---
name: lms-domain-rules
description: Apply AI Strategic Academy domain rules for a closed Russian-first LMS. Use when working on courses, cohorts, curators, progress, assignments, quizzes, certificates, payments, analytics, audit, consent, or any LMS product behavior.
---

# LMS Domain Rules

## Prerequisites
- [ ] Understanding of the project as a closed LMS managed by one academy.
- [ ] Familiarity with Russian-first UI requirements.

## Context
Used when working on any LMS product behavior (courses, cohorts, curators, etc.) to ensure alignment with the academy's specific closed-system logic.

## Definitions
- **Closed LMS**: An internal system for a single academy, not a public marketplace.
- **Russian-first UI**: All user-facing strings must be in Russian.

## Logic (The "Claw")
1. Read `docs/specification.md` and `docs/implementation-plan.md`.
2. Confirm the change supports core LMS domains: learning, curator control, progress, certification, payments, reporting, audit, or consent.
3. Preserve Russian-first UI copy.
4. Keep role boundaries explicit: admin, instructor, student, curator, super_curator, customer_observer.

### Instructional Hints (Claws)
> **HINT:** Do not add public marketplace or multi-vendor features.
> **HINT:** Always verify that business logic is NOT in UI components.
> **HINT:** Ensure learner data exposure to customer observers is minimal and strictly for reporting.

## Post-conditions
- [ ] Domain behavior aligns with the closed LMS model.
- [ ] Roles and permissions remain strictly enforced.
- [ ] Russian user-facing copy is intact.

## Validation steps
1. Check `docs/updates.md` for a record of the change.
2. Verify that no English strings were introduced to the UI.
3. Ensure server-side RBAC is not bypassed.
