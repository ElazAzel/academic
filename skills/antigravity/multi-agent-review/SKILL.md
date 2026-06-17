---
name: multi-agent-review
description: Review AI Strategic Academy changes with multiple specialized perspectives in Antigravity. Use when evaluating architecture, security, UX, QA, documentation, or release readiness after one or more agents changed the project.
---

# Multi-Agent Review

## Prerequisites
- [ ] Changes submitted for review by an agent.
- [ ] Access to all project documentation and design guidelines.

## Context
Used to catch cross-domain problems before changes are accepted into the main branch.

## Definitions
- **Cross-domain problem**: An issue where a change in one module breaks assumptions or functionality in another.

## Logic (The "Claw")
1. Read changed files and relevant docs (`docs/implementation-plan.md`, `docs/security-review.md`).
2. Review from multiple perspectives: product fit, architecture, backend, UX, security, QA.
3. Prioritize findings by production impact.
4. Require line/file references for findings.

### Instructional Hints (Claws)
> **HINT:** Always check for direct DB access from UI — it is a strictly forbidden pattern.
> **HINT:** Verify that RBAC checks are present on all privileged paths.

## Post-conditions
- [ ] Review findings are documented and prioritized.
- [ ] Required fixes are clearly identified.

## Validation steps
1. Confirm that all high-severity findings have associated fix tasks.
2. Check that `docs/updates.md` reflects the review results.
3. Ensure the release recommendation is based on evidence.
