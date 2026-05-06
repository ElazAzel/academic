---
name: lms-qa-release
description: Verify AI Strategic Academy changes in Codex. Use when running lint, typecheck, tests, builds, smoke checks, release readiness, or documenting verification and residual risk.
---

# LMS QA Release

## Goal

Make each project change releasable or clearly mark what blocks release.

## Workflow

1. Read `docs/implementation-plan.md` and `docs/updates.md`.
2. Identify the changed domain and expected checks.
3. Run, when available: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test`, `npm.cmd run build`.
4. For UI changes, add or run Playwright smoke checks when practical.
5. For API changes, verify validation, RBAC, success path, and error path.
6. Record results in `docs/updates.md`.

## Guardrails

- Do not claim Docker/K8s/Vercel verification unless actually run.
- Do not hide skipped tests.
- Do not accept green tests if the changed behavior has no relevant assertion.

## Output Checklist

- Passed checks.
- Failed/skipped checks with reason.
- Residual risk.
- Recommended next action.

