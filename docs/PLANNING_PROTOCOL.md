# Stricter Planning Protocol (Superpowers Integration)

Every task in this project MUST follow the **Superpowers Planning Protocol** to ensure high-quality, predictable outcomes across all agents.

## 1. Deep Context Gathering
Before setting a plan, the agent must:
- Explore the domain-specific logic in `server/modules/`.
- Check existing specifications in `docs/superpowers/specs/`.
- Verify role boundaries (admin/curator/etc.) for the feature.

## 2. Plan Structure
Every plan created with `set_plan` must include:
- **Context**: Why is this change being made?
- **Definitions**: Clarification of new or reused domain terms.
- **Constraints**: Architecture boundaries (e.g., "No Prisma in components", "Russian-only UI").
- **Verification Steps**: How will we know it works?

## 3. Mandatory Pre-commit
All plans MUST end with a "Complete pre-commit steps" phase that includes:
- `npm run verify` (lint, typecheck, tests, build).
- Manual verification of the "Golden Standard" (GStack).
- Documentation update in `docs/updates.md`.

## 4. Subagent Driven Development
For complex tasks, use the `superpowers:subagent-driven-development` pattern:
1. Define clear interfaces/contracts first.
2. Break work into independent, testable sub-tasks.
3. Validate each sub-task against its specific post-conditions.
