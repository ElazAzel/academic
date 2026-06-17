---
name: skill-name
description: Clear description of what this skill does and when to use it.
---

# Skill Name

## Prerequisites
- [ ] List of skills or context that must be present before this skill can be applied.
- [ ] Example: "Authenticated user session with 'admin' role."

## Context
Provide the "why" and "where".
Example: "Used when modifying the core LMS domain logic in `server/modules/*`."

## Definitions
Define key terms or domain concepts used in this skill.
Example: "Cohort: A group of students following the same schedule."

## Logic (The "Claw")
Detailed instructions on "how" to perform the task. This is the core instruction set (Claw-code).
1. Step one...
2. Step two...

### Instructional Hints (Claws)
> **HINT:** When doing X, always ensure Y is validated using Zod.

## Post-conditions
What should be true after the skill is applied.
- [ ] Business logic is updated.
- [ ] DB schema is migrated (if applicable).

## Validation steps
Verifiable steps to ensure the skill was applied correctly.
1. Run `npm run test:unit`.
2. Check for 0 lint warnings.
3. Verify the change in `docs/updates.md`.
