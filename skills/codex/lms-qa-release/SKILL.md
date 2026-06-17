---
name: lms-qa-release
description: Verify AI Strategic Academy changes in Codex. Use when running lint, typecheck, tests, builds, smoke checks, release readiness, or documenting verification and residual risk.
---

# LMS QA Release

## Prerequisites
- [ ] Completion of the implementation phase.
- [ ] Access to the test environment (local or staging).

## Context
Used to make each project change releasable or to clearly identify what blocks the release.

## Definitions
- **Release Gate**: A mandatory check (lint, test, build) that must pass before release.
- **Smoke Check**: A basic test to ensure core functionality is not broken.

## Logic (The "Claw")
1. Identify the changed domain and expected checks based on `docs/updates.md`.
2. Execute mandatory gates: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
3. For UI changes, run Playwright smoke checks.
4. For API changes, verify validation, RBAC, success path, and error path.

### Instructional Hints (Claws)
> **HINT:** Do not accept green tests if the changed behavior has no relevant assertion.
> **HINT:** Clearly document any skipped tests or residual risks in `docs/updates.md`.

## Post-conditions
- [ ] All mandatory release gates are passed.
- [ ] Verification results are recorded in `docs/updates.md`.

## Validation steps
1. Confirm that `npm run verify` passes.
2. Ensure Playwright tests for the relevant flow are successful.
3. Verify that residual risks (if any) are explicitly documented.
