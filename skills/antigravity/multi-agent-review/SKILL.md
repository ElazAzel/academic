---
name: multi-agent-review
description: Review AI Strategic Academy changes with multiple specialized perspectives in Antigravity. Use when evaluating architecture, security, UX, QA, documentation, or release readiness after one or more agents changed the project.
---

# Multi-Agent Review

## Goal

Catch cross-domain problems before changes are accepted.

## Workflow

1. Read changed files, `docs/implementation-plan.md`, `docs/security.md`, and `docs/updates.md`.
2. Review from these perspectives: product fit, architecture, backend correctness, UX/accessibility, security/privacy, QA/release, documentation.
3. Prioritize findings by production impact.
4. Require line/file references for actionable findings.
5. Confirm `docs/updates.md` reflects the change and verification.

## Guardrails

- Do not focus on cosmetic preferences before correctness/security.
- Do not approve undocumented behavior changes.
- Do not accept direct DB access from UI.
- Do not accept missing RBAC checks on privileged paths.

## Output Checklist

- Findings first, ordered by severity.
- Open questions.
- Required fixes.
- Release recommendation.

