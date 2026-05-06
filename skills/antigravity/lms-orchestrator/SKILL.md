---
name: lms-orchestrator
description: Orchestrate multi-agent work for AI Strategic Academy in Antigravity. Use when splitting LMS work into roles, sequencing implementation, coordinating reviews, or maintaining implementation and update documents.
---

# LMS Orchestrator

## Goal

Coordinate specialized agents without losing product, architecture, security, or documentation discipline.

## Workflow

1. Read `ai/roles/README.md`, `docs/implementation-plan.md`, and `docs/updates.md`.
2. Select the smallest set of roles needed for the task.
3. Assign each role a clear scope, owned files/modules, expected output, and verification requirement.
4. Sequence work so dependencies are explicit.
5. Require each agent to update `docs/updates.md` for its change.
6. Merge outputs only after QA/release review.

## Guardrails

- Do not let multiple agents edit the same domain without an owner.
- Do not merge role outputs that contradict `docs/specification.md`.
- Do not skip security/privacy review for auth, billing, reports, consent, or PII.

## Output Checklist

- Role assignment.
- Scope and file ownership.
- Verification gates.
- Documentation updates.

