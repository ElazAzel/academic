# UX/UI Audit 2026: AI Strategic Academy

Date: 2026-05-24  
Auditor: Codex  
Scope: active documentation, user-provided `/student` screenshot, source review of layout/design-system components, and current 2026 design reference baseline.  
Status: `partial` for implementation readiness, `partial` for visual-system consistency after the 2026-05-24 P0 implementation pass.

## Implementation Progress

2026-05-24 P0 pass completed:

- removed core glass/shine/blob/gradient/default hover-lift patterns from `app` and `components`;
- normalized radii and elevations across shared primitives and role surfaces;
- kept `/student` learning-first with one compact secondary gamification block;
- fixed certificate PNG background upload fallback behavior;
- validated with `rg` banned-pattern smoke, lint, typecheck, unit tests, production build, and Playwright responsive smoke for `/login` and `/student`.

Remaining status stays `partial` because full role-workspace redesign, seeded learning-flow proof, keyboard smoke, and WCAG 2.2 AA-oriented checks are not yet complete.

## Executive Verdict

The platform currently reads as AI-generated because the product has no enforced visual operating system. The codebase mixes Material 3 tokens, shadcn-style primitives, glassmorphism, gradient accents, animated backgrounds, oversized cards, emoji/gamification copy, and ad hoc role dashboards. These choices compete with the product identity: a closed academic operations platform where the next action must be clear.

The target state for 2026 should not be more decoration. It should be a restrained academic operations UI: dense enough for staff work, calm enough for students, accessible by default, adaptive across desktop/tablet/mobile, and governed by a small set of reusable components and tokens.

Current UX/UI release status: `partial`.

Current visual-system status: `partial`.

Primary correction: stop treating screens as isolated dashboards and rebuild the interface around role-specific work queues and the unified learning flow:

Course -> Module -> Block -> Lesson -> Materials / Test / Assignment / Question / Rating / Completion.

## Reference Baseline

This audit uses stable standards as the baseline and 2026 trend reports only as directional context.

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) for testable accessibility, keyboard, focus, contrast, target size, reflow, and predictable interaction requirements.
- [NN/g 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) for consistency, system status, error prevention, recognition over recall, and aesthetic minimalism.
- [NN/g Design Systems 101](https://www.nngroup.com/articles/design-systems-101/) for design systems as standards that reduce redundancy and create shared language at scale.
- [Material adaptive layout guidance](https://developer.android.com/codelabs/adaptive-material-guidance?hl=en) for compact/medium/expanded window classes, adaptive navigation, containment, and large-screen grouping.
- [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) for readable typography, sufficient controls, keyboard access, reduced motion, and cognitive simplicity.
- [Atlassian color foundations](https://atlassian.design/foundations/color) for semantic color roles and tokenized color application.
- [IBM Carbon accessibility overview](https://carbondesignsystem.com/guidelines/accessibility/overview/) for accessible products as better experiences for all users.
- [GOV.UK Design System](https://design-system.service.gov.uk/get-started/) for production components/patterns backed by user research rather than aesthetic novelty.
- 2026 market direction checked from [UX Design Institute](https://www.uxdesigninstitute.com/blog/the-top-ux-design-trends-in-2026/), [UXPin](https://www.uxpin.com/studio/blog/ui-ux-design-trends/), and [Creative Bloq](https://www.creativebloq.com/design/graphic-design/texture-warmth-and-tactile-rebellion-the-big-graphic-design-trends-for-2026/): calmer experiences, AI governed by real components, accessibility and compliance, functional minimalism, human warmth, and rejection of generic AI polish.

## Evidence Reviewed

Code and design evidence:

- `app/globals.css`: global radial-gradient background, `.glass-panel`, `.glass-card-premium`, `btn-shine`, many animation utilities, and mobile overflow hacks.
- `tailwind.config.ts`: multiple overlapping token systems and legacy shadows/radii alongside M3 tokens.
- `components/layout/app-shell.tsx`: desktop sidebar uses glass card styling; mobile bottom nav and desktop sidebar switch at `lg`, but tablet behavior is not yet a first-class adaptive model.
- `components/auth/login-screen.tsx`: abstract blurred blobs and gradient accent create a template SaaS login feeling, not a sober closed academy entry.
- `components/lms/dashboard-widgets.tsx`: metric and course cards use glass, gradient strips, display-scale numbers, hover elevation, and repeated decorative emphasis.
- `components/lms/student-course-dashboard-grid.tsx`: course cards include gradient strips, emoji completion copy, forecast copy, and decorative progress styling.
- `components/lms/background-animations.tsx`: decorative animated shapes exist in the component surface.
- `components/lms/curator-operations-board.tsx` and `components/lms/super-curator-operations-board.tsx`: operational dashboards mix filters, queues, glass surfaces, hover transforms, custom shadows, and token/non-token color classes.
- User screenshot of `/student`: confirmed the previous issue where learning priority competed with gamification; the latest code reduces the achievement block height, but the visual language issue remains systemic.

Audit constraints:

- This pass is a heuristic/product/design-system audit, not a full usability study with students, curators, instructors, and administrators.
- No mutating role workflows were executed.
- Existing uncommitted UI component changes were present before this audit and were not reverted.

## Why It Feels AI-Generated

| Finding | Status | Evidence | User impact | Correction |
| --- | --- | --- | --- | --- |
| Visual system conflict | `broken` | M3 tokens, shadcn tokens, glass classes, gradients, `rounded-2xl/3xl`, custom shadows and inline color classes coexist. | Users perceive screens as assembled templates rather than one product. | Create one design-token contract and remove one-off decorative surfaces. |
| Decoration outranks hierarchy | `broken` | Gradient top strips, glass surfaces, blurred blobs, shine buttons, hover transforms, and animated backgrounds are common. | The eye is pulled to effects instead of the next task. | Use flat surfaces, semantic status, clear hierarchy, and restrained elevation. |
| Dashboard-first thinking | `partial` | Many pages start with metrics/cards; operational roles need queues and actions. | Staff must scan decorative metrics before acting. | Replace dashboard ornament with task queues: questions, assignments, risks, reviews, certificates, access. |
| Gamification competes with learning | `partial` | Student XP/achievement surfaces still require product restraint even after duplication was fixed. | The student journey feels split between course progress and game layer. | Keep achievements secondary and collapsed; continue learning stays first. |
| Inconsistent density | `broken` | Operational pages and student pages use similar large card patterns. | Admin/curator work becomes slow on desktop; mobile pages become long. | Define density modes: student comfortable, staff compact, reports/table dense. |
| Weak adaptive model | `partial` | Breakpoint logic exists, but tablet/desktop are not designed as separate information architectures. | Tablets can receive either cramped mobile or overly wide desktop behavior. | Adopt compact/medium/expanded layout rules and test 375, 768, 1024, 1440. |
| Accessibility not proven | `partial` | Focus and reduced-motion CSS exist; contrast, focus visibility, target size, keyboard order, dialogs and hover-only behavior are not fully audited. | Some users may not complete learning or operational work reliably. | Make WCAG 2.2 AA a release gate and test keyboard/screen-reader paths. |
| Russian content hierarchy is uneven | `partial` | Large cards with long Russian labels, badges, and descriptions risk truncation or visual noise. | Scanning slows down; important statuses blur together. | Define Russian copy lengths, table labels, badge labels, and empty/error state grammar. |
| Icon system is mixed | `partial` | Material Symbols and lucide icons are both used in core UI. | Visual rhythm and stroke/fill styles vary. | Standardize icon rules: one primary icon set per surface, one size scale. |
| Comments/classes reveal style-led work | `partial` | Names such as `premium`, `glassmorphic`, `beautiful`, `btn-shine` encode aesthetic intent rather than product role. | Future contributors repeat visual effects instead of product decisions. | Rename and refactor around role/task semantics. |

## Target 2026 Design Direction

AI Strategic Academy should look like a serious academic operating system, not a public SaaS landing page or course marketplace.

Design keywords:

- calm;
- role-specific;
- task-first;
- dense but readable;
- Russian-first;
- accessible;
- low-decoration;
- data-grounded;
- component-governed.

Do not chase these visual trends:

- generic glassmorphism;
- blurred gradient blobs;
- shiny buttons;
- oversized hero cards inside dashboards;
- decorative emoji status copy;
- card grids where a table or queue is the real workflow;
- purple/blue gradients as the default brand expression;
- animations that do not communicate state.

Use 2026 direction this way:

- AI should be contextual support inside role workflows, not a decorative assistant bubble.
- Personalization should mean better next actions and filters, not more visual novelty.
- Human warmth should come from clear Russian copy, good spacing, and course context, not mascots or playful clutter.
- Motion should confirm state changes and respect reduced motion.
- Design-system governance should prevent AI-generated-looking one-off UI.

## Product-Level UX Requirements

| Area | Current status | 2026-quality requirement |
| --- | --- | --- |
| Student dashboard | `partial` | First screen starts with `Продолжить обучение`, then current course context, deadlines, curator answers, certificates; gamification stays secondary/collapsed. |
| Student course page | `partial` | Course page shows module/block/lesson structure, progress, locked/unlocked states, next lesson CTA, embedded certificate state, and curator support in one context. |
| Lesson player | `partial` | Lesson contains materials, test, assignment, question, rating, completion and prev/next without sending the student to disconnected flows. |
| Curator dashboard | `partial` | Starts with operational queues: unanswered questions, submissions awaiting review, high-risk students, overdue cohorts, and quick reply/review actions. |
| Super curator dashboard | `partial` | Shows workload, distribution imbalance, risk clusters, cohort health, and curator SLA queues. |
| Instructor dashboard | `partial` | Shows courses requiring content/publish action, forwarded questions, tests/assignments needing attention, and course analytics. |
| Admin dashboard | `partial` | Shows access/account/cohort/enrollment/certificate/audit queues and system health, not decorative KPIs. |
| Customer observer | `partial` | Read-only cohort/project progress, certificates, and reports; no edit affordances or internal admin metrics. |
| Login/root | `partial` | Closed academy entry should be simple, trustworthy, fast, and low-decoration. |
| Reports/analytics | `partial` | Management support: filters, tables, exports, trend clarity, no BI clutter. |

## Visual System Requirements

### Tokens

Create a design contract that defines:

- color roles: surface, text, border, primary action, secondary action, success, warning, danger, information, disabled;
- spacing scale: 4px base, but role-specific layout gutters for compact/medium/expanded screens;
- radius scale: 4, 6, 8, 12; avoid 24/32 except modals or very specific media;
- elevation scale: 0, 1, 2; remove glass hover transforms as a default;
- typography scale for dashboards, forms, tables, course reading, and mobile;
- status badge variants and label vocabulary;
- data table density and row-height rules;
- focus ring and target-size rules.

### Components

Standardize and document these first:

- `AppShell`;
- role navigation;
- `PageHeader`;
- `Card`;
- `Button`;
- `StatusBadge`;
- `MetricCard`;
- `EmptyState`;
- `PageError`;
- `PageSkeleton`;
- `DataTable`;
- `Tabs`;
- `Accordion`;
- `Dialog`;
- `FormField`;
- `CourseCard`;
- `LessonCard`;
- `QuestionQueue`;
- `AssignmentReviewQueue`;
- `RiskQueue`.

### Banned or Restricted Patterns

| Pattern | Decision | Reason |
| --- | --- | --- |
| `glass-card-premium` | Ban from core product surfaces | It creates generic AI/SaaS feel and weakens hierarchy. |
| `btn-shine` | Ban | Shiny CTA animation is not appropriate for academic operations. |
| Abstract blurred blobs | Ban except experimental marketing, which this product does not need | Closed platform root is login, not a campaign landing. |
| Gradient strips on cards | Restrict to rare brand moments | Current use is decorative and repetitive. |
| Hover lift on operational cards | Restrict | Tables/queues need stable layouts and predictable scanning. |
| Emoji in status copy | Restrict | Use icons/status badges; keep emoji inside chat/user-generated content if necessary. |
| `rounded-3xl` on standard cards/forms | Ban | Creates soft toy-like surfaces instead of professional tools. |
| Global overflow clipping for all rounded elements | Ban | Can hide focus rings, popovers, table overflow, and long Russian text. |

## Responsive Requirements

Test and design every core route at:

- 375x812 phone;
- 430x932 large phone;
- 768x1024 tablet portrait;
- 1024x768 tablet landscape;
- 1280x800 laptop;
- 1440x900 desktop;
- 1920x1080 wide desktop.

Acceptance criteria:

- no horizontal overflow;
- no text overlap;
- controls keep at least 44px mobile target where practical;
- primary action remains visible without scrolling on student dashboard and lesson player;
- staff queues remain usable without card bloat on desktop;
- table overflow uses explicit horizontal scroll containers, not global clipping;
- bottom navigation does not cover content;
- focus indicators are never clipped;
- dialogs fit mobile viewport and have scrollable bodies.

## Accessibility Requirements

Minimum release gate: WCAG 2.2 AA-oriented audit.

Required checks:

- keyboard-only completion of login, course open, lesson completion, quiz attempt, assignment submit, curator answer, admin certificate issue;
- visible focus and focus not obscured by sticky headers/bottom nav;
- correct heading hierarchy and page landmarks;
- contrast for text, icons, badges, disabled states, progress bars, table rows;
- status does not rely on color alone;
- reduced motion respected for page transitions, hover effects, animated backgrounds, progress animations;
- dialogs have accessible names, focus trap, escape/close behavior, and scrollable content;
- form labels, errors and help text are explicit;
- screen-reader announcement for async save/submit states;
- mobile reflow without loss of content or controls.

## Redesign Roadmap

### P0: Visual Foundation

Status: `missing`

Goal: remove the generated-template look by enforcing one visual system.

Tasks:

1. Replace `.glass-card-premium`, `.glass-panel`, `btn-shine`, decorative blobs, card gradients and default hover lift with tokenized surfaces.
2. Normalize card/button/dialog/table/form radii and elevations.
3. Reduce dominant blue/purple gradient reliance; use semantic neutral surfaces and status colors.
4. Create a route-level UI inventory and delete duplicate one-off styles.
5. Add a lightweight style audit command or checklist using `rg` for banned patterns.

Exit criteria:

- no core dashboard depends on glass/shine/blobs;
- cards/buttons/badges/tables use shared primitives;
- all role dashboards share the same shell and density rules.

### P0: Student Journey Redesign

Status: `partial`

Goal: make the student cabinet feel like one learning path.

Tasks:

1. Keep `Продолжить обучение` as the first block on `/student`.
2. Move XP/achievements to a compact secondary area and keep details collapsed.
3. Rework `/student/my-courses` into compact course list/cards with progress and next action.
4. Rework `/student/courses/[courseId]` around module/block/lesson structure and next lesson CTA.
5. Rework `/student/lessons/[lessonId]` so materials, test, assignment, question, rating and completion stay in the lesson context.
6. Reduce separate quiz/assignment pages to aggregators with clear back-links to lesson/course context.

Exit criteria:

- a student can understand what to do next in under five seconds;
- no assessment feels detached from the course;
- no gamification element appears above the learning action.

### P1: Operational Role Workspaces

Status: `partial`

Goal: replace decorative dashboards with role-specific work queues.

Tasks:

1. Curator: unanswered questions, review queue, risk queue, overdue students, quick actions.
2. Super curator: curator load, distribution gaps, cohort risk, SLA queues.
3. Instructor: content/publish tasks, forwarded questions, assessment quality, course analytics.
4. Admin: access issuance, cohorts, enrollments, certificates, audit, platform health.
5. Observer: read-only reports and certificates without mutation affordances.

Exit criteria:

- every dashboard answers "What should this role do next?";
- metrics are secondary to queues unless a role explicitly needs monitoring first.

### P1: Adaptive Layout and Accessibility QA

Status: `missing`

Goal: make desktop, tablet and mobile intentionally designed, not merely responsive.

Tasks:

1. Define compact/medium/expanded layout rules for shell, nav, cards, tables, lesson player and builder.
2. Add Playwright visual/DOM smoke for core routes at mobile/tablet/desktop.
3. Add keyboard smoke paths for the highest-value scenarios.
4. Audit dialogs, sticky bars, bottom nav and focus clipping.
5. Add reduced-motion checks for page transitions and decorative animations.

Exit criteria:

- no horizontal overflow on core routes;
- no clipped focus indicators;
- no hover-only core behavior;
- all primary workflows are keyboard reachable.

### P2: Course Builder, Reports and Polish

Status: `partial`

Goal: make advanced surfaces coherent after core flow is corrected.

Tasks:

1. Rework builder as a three-pane tool: curriculum tree, editor, preview/publish checks.
2. Standardize reports with filters, table density, export status, and empty/error states.
3. Rework certificate designer/admin certificate pages with practical controls and restrained preview surfaces.
4. Revisit dark mode after light-mode token system is stable.
5. Add visual regression snapshots after core UI settles.

## Definition of Done for UX/UI

A route is UX/UI-ready only when:

- primary role action is visible and clear;
- role scope is obvious;
- route uses shared components and tokens;
- empty, loading, error and unauthorized states exist;
- mobile/tablet/desktop layouts are checked;
- keyboard/focus path works;
- status language is Russian-first and consistent;
- no decorative pattern competes with task hierarchy;
- data mutations and navigation keep the user in the correct course/role context;
- validation evidence is logged in `docs/update-log.md`.

## Immediate Next Step

Implement P0 Visual Foundation and P0 Student Journey as the first redesign batch:

1. remove glass/shine/blob/gradient defaults from shell, login, student dashboard and shared cards;
2. lock Card/Button/Badge/Table/Form tokens;
3. redesign `/student`, `/student/my-courses`, `/student/courses/[courseId]`, `/student/lessons/[lessonId]` with responsive verification.
