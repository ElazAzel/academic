export const releaseHardeningContractVersion = "2026-05-26";

export type ReleaseStatus = "done" | "partial" | "blocked" | "planned";
export type EvidenceKind = "docs" | "unit" | "e2e" | "browser" | "gate" | "ops" | "code";

export const productRoles = [
  "admin",
  "instructor",
  "student",
  "curator",
  "super_curator",
  "customer_observer",
] as const;

export type ProductRoleId = (typeof productRoles)[number];

export const roleRedirectPriority = [
  "admin",
  "super_curator",
  "curator",
  "instructor",
  "customer_observer",
  "student",
] as const satisfies readonly ProductRoleId[];

export const agentRoles = [
  "orchestrator",
  "product-owner",
  "principal-architect",
  "backend-next-prisma",
  "frontend-lms-ux",
  "security-privacy",
  "qa-release",
  "devops-platform",
  "data-analytics",
  "technical-writer",
] as const;

export type AgentRoleId = (typeof agentRoles)[number];

export const projectSkills = [
  "lms-domain-rules",
  "lms-implementation",
  "lms-qa-release",
  "lms-orchestrator",
  "multi-agent-review",
] as const;

export type ProjectSkillId = (typeof projectSkills)[number];

export const technicalSkills = [
  "deploy-to-vercel",
  "next-best-practices",
  "next-cache-components",
  "next-upgrade",
  "shadcn",
  "supabase",
  "supabase-postgres-best-practices",
  "vercel-cli-with-tokens",
  "vercel-composition-patterns",
  "vercel-optimize",
  "vercel-react-best-practices",
  "vercel-react-native-skills",
  "vercel-react-view-transitions",
  "web-design-guidelines",
] as const;

export type TechnicalSkillId = (typeof technicalSkills)[number];

export interface EvidenceRequirement {
  id: string;
  kind: EvidenceKind;
  requiredForDone: boolean;
  description: string;
}

export interface ReleaseWorkPackage {
  id: `WP${number}`;
  title: string;
  status: ReleaseStatus;
  owners: AgentRoleId[];
  productRoles: ProductRoleId[];
  projectSkills: ProjectSkillId[];
  technicalSkills: TechnicalSkillId[];
  scope: string[];
  exitCriteria: string[];
  evidence: EvidenceRequirement[];
}

export interface ReleaseGate {
  id: string;
  title: string;
  status: ReleaseStatus;
  command?: string;
  exitCriteria: string;
}

const allRoles = [...productRoles];

export const releaseWorkPackages = [
  {
    id: "WP0",
    title: "Truth Sync и агентская диспетчеризация",
    status: "done",
    owners: ["orchestrator", "technical-writer"],
    productRoles: allRoles,
    projectSkills: ["lms-domain-rules", "lms-qa-release", "lms-orchestrator", "multi-agent-review"],
    technicalSkills: ["next-best-practices", "vercel-react-best-practices"],
    scope: [
      "Единая матрица ролей, агентов, skills и release work packages",
      "Документы различают implementation evidence и scenario proof",
      "Статус done допускается только с явным evidence gate",
    ],
    exitCriteria: [
      "Матрицы синхронизированы с ai/roles, skills и skills-lock.json",
      "Документы указывают release readiness как partial до закрытия WP1-WP6",
      "Unit-тесты проверяют контракт release hardening",
    ],
    evidence: [
      {
        id: "release-hardening-contract-test",
        kind: "unit",
        requiredForDone: true,
        description: "tests/unit/release-hardening-readiness.test.ts validates roles, skills, work packages and gates.",
      },
      {
        id: "release-hardening-docs",
        kind: "docs",
        requiredForDone: true,
        description: "docs/release.md is the active execution baseline for WP1-WP6.",
      },
    ],
  },
  {
    id: "WP1",
    title: "Six-role Scenario Proof",
    status: "done",
    owners: ["qa-release", "product-owner", "frontend-lms-ux"],
    productRoles: allRoles,
    projectSkills: ["lms-domain-rules", "lms-qa-release", "multi-agent-review"],
    technicalSkills: ["web-design-guidelines", "next-best-practices"],
    scope: [
      "Student learning path from login through lesson context and certificate state",
      "Admin, instructor, curator, super curator and observer operational scenarios",
      "Seeded or disposable environment proof beyond static route rendering",
    ],
    exitCriteria: [
      "Playwright scenarios cover the six roles with meaningful actions",
      "Student proof stays inside Course -> Module -> Block -> Lesson context",
      "Static route smoke is not used as the only readiness proof",
    ],
    evidence: [
      {
        id: "six-role-playwright-suite",
        kind: "e2e",
        requiredForDone: true,
        description: "Playwright suite proves role workflows against seeded data.",
      },
    ],
  },
  {
    id: "WP2",
    title: "Access, Privacy, Ownership Hardening",
    status: "done",
    owners: ["security-privacy", "backend-next-prisma"],
    productRoles: allRoles,
    projectSkills: ["lms-domain-rules", "lms-implementation", "lms-qa-release", "multi-agent-review"],
    technicalSkills: ["supabase", "supabase-postgres-best-practices"],
    scope: [
      "Guessed IDs for enrollment, quiz, assignment, certificate, media and reports",
      "Curator assigned-student scope and instructor course scope",
      "Customer observer read-only and scoped report/certificate access",
      "Notification channel default stays in_app",
    ],
    exitCriteria: [
      "Negative-path tests cover ownership and role boundaries",
      "Mutation routes require role, scope and Zod validation",
      "Observer cannot mutate or export global platform data",
      "Email is sent only for explicit email or email_and_in_app channels",
    ],
    evidence: [
      {
        id: "negative-access-suite",
        kind: "unit",
        requiredForDone: true,
        description: "Unit and integration tests cover forbidden ownership and observer mutation paths.",
      },
      {
        id: "route-handler-scope-review",
        kind: "code",
        requiredForDone: true,
        description: "Route handlers using requireUser() have explicit service-level scope proof.",
      },
    ],
  },
  {
    id: "WP3",
    title: "Architecture Boundary Cleanup",
    status: "done",
    owners: ["principal-architect", "backend-next-prisma"],
    productRoles: allRoles,
    projectSkills: ["lms-implementation", "lms-qa-release", "multi-agent-review"],
    technicalSkills: ["next-best-practices", "vercel-react-best-practices"],
    scope: [
      "Move business queries from server pages/components into server modules or actions",
      "Keep Route Handlers thin",
      "Keep modular monolith as the active architecture",
    ],
    exitCriteria: [
      "Critical UI routes consume typed DTOs instead of inline domain queries",
      "No new direct Prisma calls are added to React components",
      "No microservice runtime split is introduced without ADR",
    ],
    evidence: [
      {
        id: "architecture-boundary-scan",
        kind: "code",
        requiredForDone: true,
        description: "Source scan shows critical UI surfaces use server modules/actions for business logic.",
      },
    ],
  },
  {
    id: "WP4",
    title: "Role Workspace UX Optimization",
    status: "done",
    owners: ["frontend-lms-ux", "product-owner"],
    productRoles: allRoles,
    projectSkills: ["lms-domain-rules", "lms-qa-release", "multi-agent-review"],
    technicalSkills: ["web-design-guidelines", "shadcn", "vercel-react-best-practices"],
    scope: [
      "Student continue learning and unified lesson context",
      "Curator and super curator queues for questions, assignments, risks and workload",
      "Admin and instructor operational next actions",
      "Observer read-only reports and certificates without edit affordances",
    ],
    exitCriteria: [
      "Every role dashboard answers what the role should do next",
      "Empty, error and loading states exist for operational queues",
      "Responsive and keyboard smoke covers core flows",
    ],
    evidence: [
      {
        id: "role-workspace-ux-smoke",
        kind: "browser",
        requiredForDone: true,
        description: "Responsive and keyboard smoke proves role dashboards and core actions.",
      },
    ],
  },
  {
    id: "WP5",
    title: "Reporting, Analytics, Certificates, Notifications Proof",
    status: "done",
    owners: ["data-analytics", "security-privacy", "qa-release"],
    productRoles: allRoles,
    projectSkills: ["lms-domain-rules", "lms-implementation", "lms-qa-release"],
    technicalSkills: ["supabase-postgres-best-practices", "vercel-optimize"],
    scope: [
      "Role-scoped report contracts",
      "Certificate issue, revoke, download and public verification states",
      "Notification event proof for learning and operational events",
    ],
    exitCriteria: [
      "Exports cannot exceed actor scope",
      "Revoked certificates are visibly invalid",
      "Notification events use explicit channel rules",
    ],
    evidence: [
      {
        id: "report-certificate-notification-suite",
        kind: "unit",
        requiredForDone: true,
        description: "Tests cover scoped exports, certificate privacy and notification channel behavior.",
      },
    ],
  },
  {
    id: "WP6",
    title: "DevOps, Release, Backup, Observability",
    status: "done",
    owners: ["devops-platform", "qa-release"],
    productRoles: allRoles,
    projectSkills: ["lms-qa-release", "lms-orchestrator", "multi-agent-review"],
    technicalSkills: ["deploy-to-vercel", "vercel-cli-with-tokens", "vercel-optimize", "supabase"],
    scope: [
      "Disposable local database and seeded scenario run",
      "CI, Vercel preview/staging, health checks and rollback",
      "Backup/restore drill and cron/outbox observability",
      "Secrets and environment contract verification",
    ],
    exitCriteria: [
      "npm run verify:release passes in the target environment",
      "Backup/restore and rollback are evidenced",
      "Any external blocker is documented as the only remaining release blocker",
    ],
    evidence: [
      {
        id: "verify-release-target-env",
        kind: "gate",
        requiredForDone: true,
        description: "Full verify:release run passes against the selected release environment.",
      },
      {
        id: "backup-restore-drill",
        kind: "ops",
        requiredForDone: true,
        description: "Backup restore and rollback drill are executed and recorded.",
      },
    ],
  },
] as const satisfies readonly ReleaseWorkPackage[];

export const releaseGates = [
  {
    id: "lint-zero-warning",
    title: "Zero-warning lint",
    status: "done",
    command: "npm run lint -- --max-warnings=0",
    exitCriteria: "ESLint passes with 0 errors and 0 warnings.",
  },
  {
    id: "typecheck",
    title: "TypeScript check",
    status: "done",
    command: "npm run typecheck",
    exitCriteria: "TypeScript check passes without application errors.",
  },
  {
    id: "unit-tests",
    title: "Unit and integration tests",
    status: "done",
    command: "npm run test",
    exitCriteria: "Vitest suite passes.",
  },
  {
    id: "production-build",
    title: "Production build",
    status: "done",
    command: "npm run build",
    exitCriteria: "Next.js production build completes.",
  },
  {
    id: "six-role-workflow-e2e",
    title: "Six-role workflow E2E",
    status: "done",
    command: "npm run test:e2e",
    exitCriteria: "Seeded Playwright scenarios prove six-role workflows, not only route rendering.",
  },
  {
    id: "access-privacy-negative-paths",
    title: "Access/privacy negative paths",
    status: "done",
    exitCriteria: "Tests prove ownership, guessed-ID denial, observer read-only behavior, media/report/certificate privacy.",
  },
  {
    id: "operational-release-drill",
    title: "Operational release drill",
    status: "done",
    command: "npm run verify:release",
    exitCriteria: "Target-env release verification, health checks, backup/restore and rollback are evidenced.",
  },
] as const satisfies readonly ReleaseGate[];

export function getReleaseReadinessSummary() {
  const packageCounts = countByStatus(releaseWorkPackages);
  const gateCounts = countByStatus(releaseGates);
  const isReleaseReady =
    releaseWorkPackages.every((workPackage) => workPackage.status === "done") &&
    releaseGates.every((gate) => gate.status === "done");

  return {
    contractVersion: releaseHardeningContractVersion,
    status: isReleaseReady ? "done" : "partial",
    isReleaseReady,
    packageCounts,
    gateCounts,
    blockedPackageIds: releaseWorkPackages
      .filter((workPackage) => (workPackage.status as ReleaseStatus) === "blocked")
      .map((workPackage) => workPackage.id),
    incompletePackageIds: releaseWorkPackages
      .filter((workPackage) => (workPackage.status as ReleaseStatus) !== "done")
      .map((workPackage) => workPackage.id),
    incompleteGateIds: releaseGates
      .filter((gate) => (gate.status as ReleaseStatus) !== "done")
      .map((gate) => gate.id),
  };
}

function countByStatus(items: readonly { status: ReleaseStatus }[]) {
  return items.reduce<Record<ReleaseStatus, number>>(
    (counts, item) => {
      counts[item.status] += 1;
      return counts;
    },
    { done: 0, partial: 0, blocked: 0, planned: 0 },
  );
}
