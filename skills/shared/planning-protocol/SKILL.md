---
name: planning-protocol
description: Use the Superpowers Planning Protocol to create high-quality, verifiable plans for AI Strategic Academy. Use whenever starting a new task or refactoring complex logic.
---

# Planning Protocol

## Prerequisites
- [ ] Understanding of the "Golden Standard" Architecture (GStack).
- [ ] Familiarity with the `docs/superpowers/plans/` structure.

## Context
Used to maintain consistency and quality in task execution across multiple agents by enforcing a strict planning structure.

## Definitions
- **Verification Gate**: A mandatory check that must pass before a task is considered done.
- **Pre-commit**: The final phase of a plan focused on validation and documentation.

## Logic (The "Claw")
1. Gather deep context from `server/modules/` and existing specs.
2. Define the plan using `set_plan`.
3. Ensure every step has a clear "Verification" action.
4. Include `context`, `definitions`, and `constraints` for large tasks.

### Instructional Hints (Claws)
> **HINT:** Always check `docs/updates.md` to see if your plan conflicts with recent changes.
> **HINT:** Mandatory step: All plans must include `npm run verify`.

## Post-conditions
- [ ] A structured, verifiable plan is active.
- [ ] Architecture constraints are explicitly mentioned.

## Validation steps
1. Verify the plan includes a "Complete pre-commit steps" section.
2. Ensure no English strings are introduced in the planning language (except for technical terms).
