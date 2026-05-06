# Project Skills For Codex And Antigravity

Эта папка является запрошенной `SKILLS`-папкой проекта. Она содержит переносимые agent skills в формате `SKILL.md` для Codex и Antigravity.

## Structure

```text
skills/
  shared/
    lms-domain-rules/
      SKILL.md
  codex/
    lms-implementation/
      SKILL.md
    lms-qa-release/
      SKILL.md
  antigravity/
    lms-orchestrator/
      SKILL.md
    multi-agent-review/
      SKILL.md
```

## Usage

- Codex: copy or symlink the needed skill folder into the Codex skills directory if global auto-discovery is required, or reference the project path directly.
- Antigravity: import the needed skill folder into the workspace skills area if the IDE requires a specific discovery location.
- Shared skills are tool-agnostic and should be read before stack-specific skills when the task touches LMS domain rules.

## Maintenance Rule

When a skill changes, add a record to `docs/updates.md`. If a skill changes project workflow or task status, update `docs/implementation-plan.md`.

