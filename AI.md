# AI Strategic Academy — Project Guide

## Project Structure
- `ai/roles/` — AI role definitions.
- `skills/` — Strategic Project Skills (New Format).
- `docs/superpowers/` — Plans and Verifiable Specs.
- `server/modules/` — Core Business Logic (Gold Standard).
- `server/actions/` — Controllers (Gold Standard).

## Workflow Protocol
1. **Deep Context**: Read `docs/PLANNING_PROTOCOL.md` and `docs/ARCHITECTURE_GUIDE.md`.
2. **Standard Planning**: Always use `set_plan` with context, constraints, and definitions.
3. **Skill Usage**: Use skills from `skills/` adhering to prerequisites and post-conditions.
4. **Verifiable Specs**: New features must have a spec in `docs/superpowers/specs/` that passes `npm run verify:specs`.
5. **Documentation**: Update `docs/updates.md` after EVERY successful task.

## Key Conventions
- **Russian-only UI**: Strictly enforced.
- **No Prisma in UI**: Strictly enforced via `npm run verify`.
- **ApiError Only**: For server-side exceptions.

## AI Tools & Integrations
- **Superpowers**: Subagent-driven development.
- **Claw-code**: Embedded logic hints in `SKILL.md`.
- **Spec-Kit**: Verifiable Markdown specifications.
- **GStack**: Multi-layered modular monolith.
