---
name: lms-orchestrator
description: Orchestrate multi-agent work for AI Strategic Academy in Antigravity. Use when splitting LMS work into roles, sequencing implementation, coordinating reviews, or maintaining implementation and update documents.
---

# LMS Orchestrator

## Prerequisites
- [ ] Multi-agent environment setup.
- [ ] Clear project roadmap from `docs/implementation-plan.md`.

## Context
Used to coordinate specialized agents without losing product, architecture, security, or documentation discipline.

## Definitions
- **Orchestration**: The process of dividing and sequencing tasks among different AI roles.

## Logic (The "Claw")
1. Read `ai/roles/README.md`, `docs/implementation-plan.md`, and `docs/updates.md`.
2. Select the smallest set of roles needed for the task.
3. Assign each role a clear scope and file ownership.
4. Sequence work to manage dependencies.
5. Require agents to update documentation after their work.

### Instructional Hints (Claws)
> **HINT:** Ensure multiple agents do not edit the same domain without a designated owner.
> **HINT:** Never skip security/privacy reviews for sensitive domains like billing or PII.

## Post-conditions
- [ ] Tasks are properly assigned and sequenced.
- [ ] Role outputs are consolidated and verified.

## Validation steps
1. Review the task status in `docs/implementation-plan.md`.
2. Confirm that all sub-agents have updated `docs/updates.md`.
3. Ensure no contradictions with `docs/specification.md` exist in merged output.
