# Report Service Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split 666-line `server/modules/reports/service.ts` into definitions.ts, scope.ts, renderer.ts + service.ts

**Architecture:** Pure refactoring — no logic changes. Extract functions by responsibility into focused files, re-export through service.ts public API.

**Tech Stack:** TypeScript, existing report generators in `lib/reports/`

**Strategy:** Each task: create file → copy functions → update imports → verify build. No test changes needed.

---

### Task 1: Create definitions.ts

**Files:**
- Create: `server/modules/reports/definitions.ts`

Extract from service.ts:
- `EXT` (3 lines)
- `ReportDefinition` interface
- `REPORT_DEFINITIONS` record (80 lines)
- `REPORT_TYPE_ALIASES` (15 lines)
- `ROLE_PRIORITY` (7 lines)
- `parseReportFormat()` (4 lines)
- `normalizeReportType()` (5 lines)
- `assertReportAllowed()` (4 lines)
- `pickActorRole()` (4 lines)
- `unique()` (3 lines)
- All imports needed for these (ApiError from `@/lib/http`, RoleKey from `@prisma/client`, types from `@/lib/reports/types`, DomainRoleKey from `@/types/domain`)

The file must also export `ReportAccessContext` and `ReportDataScope` type imports (they're used but defined as interfaces in renderer's scope).

Actually wait - `ReportAccessContext` and `ReportDataScope` are defined in service.ts and used by scope.ts. Let me check what types they need.

`ReportDataScope` comes from `@/lib/reports/types`, so it's already imported. `ReportAccessContext` is defined in service.ts. I need to decide where to put it - probably in scope.ts since it's about access.

Let me restructure:
- `definitions.ts`: report definitions, types, utilities (no scope/access types)
- `scope.ts`: `ReportAccessContext`, `resolveReportScope()`, scope helpers
- `renderer.ts`: `RenderedReport`, `renderReport()`, `countRows()`
- `service.ts`: imports from all, exports public API

**Steps:**

- [ ] **Step 1: Create definitions.ts with report type definitions and utilities**

Export all definition-related code:

```typescript
import { ApiError } from "@/lib/http";
import type { ReportDataScope, ReportFormat, ReportType } from "@/lib/reports/types";
import type { DomainRoleKey } from "@/types/domain";

export const EXT: Record<ReportFormat, string> = {
  csv: ".csv",
  xlsx: ".xlsx",
  pdf: ".pdf",
};

export const REPORT_TYPE_ALIASES: Record<string, ReportType> = {
  progress: "progress",
  curator_progress: "progress",
  risk: "risk",
  curator_risk: "risk",
  assignments: "assignments",
  assignment: "assignments",
  certificates: "certificates",
  curator_workload: "curator_workload",
  workload: "curator_workload",
  weekly_cohort: "weekly_cohort",
  weekly: "weekly_cohort",
  final_cohort: "final_cohort",
  final: "final_cohort",
};

export const ROLE_PRIORITY: DomainRoleKey[] = [
  "admin", "super_curator", "curator", "instructor", "customer_observer", "student",
];

export interface ReportDefinition {
  type: ReportType;
  title: string;
  filenameBase: string;
  desc: string;
  icon: string;
  owner: string;
  decision: string;
  allowedRoles: DomainRoleKey[];
}

export const REPORT_DEFINITIONS: Record<ReportType, ReportDefinition> = {
  // ... full REPORT_DEFINITIONS from service.ts
};

export function pickActorRole(roles: string[]): DomainRoleKey | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null;
}

export function unique(values: string[]) {
  return Array.from(new Set(values));
}

export function normalizeReportType(type: string | null): ReportType {
  if (!type) throw new ApiError("bad_request", "Не указан тип отчёта", 400);
  const normalized = REPORT_TYPE_ALIASES[type];
  if (!normalized) throw new ApiError("bad_request", "Неизвестный тип отчёта", 400);
  return normalized;
}

export function parseReportFormat(format: string | null): ReportFormat {
  const normalized = format || "csv";
  if (normalized === "csv" || normalized === "xlsx" || normalized === "pdf") return normalized;
  throw new ApiError("bad_request", "Неподдерживаемый формат отчёта. Используйте csv, xlsx или pdf.", 400);
}

export function assertReportAllowed(definition: ReportDefinition, actorRole: DomainRoleKey) {
  if (!definition.allowedRoles.includes(actorRole)) {
    throw new ApiError("forbidden", "Этот отчет недоступен для текущей роли", 403);
  }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 3: Commit**

### Task 2: Create scope.ts

**Files:**
- Create: `server/modules/reports/scope.ts`

Extract from service.ts:
- `ReportAccessContext` interface
- `getCourseIdsForCohorts()`
- `resolveReportScope()`
- `scopeCacheKey()`

```typescript
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { unique } from "@/server/modules/reports/definitions";
import { getObserverScope, getScopedStudentIdsForObserver } from "@/server/modules/observer/scope";
import { getSuperCuratorScope } from "@/server/modules/super-curator/scope";
import type { ReportDataScope } from "@/lib/reports/types";
import type { DomainRoleKey } from "@/types/domain";
import type { AppSessionUser } from "@/types/domain";

const prisma = getPrisma();

export interface ReportAccessContext {
  actorRole: DomainRoleKey;
  scope: ReportDataScope;
  scopeLabel: string;
}

async function getCourseIdsForCohorts(cohortIds: string[]) {
  if (cohortIds.length === 0) return [];
  const cohorts = await prisma.cohort.findMany({
    where: { id: { in: cohortIds } },
    select: { courseId: true },
  });
  return unique(cohorts.map((c) => c.courseId).filter((id): id is string => Boolean(id)));
}

export async function resolveReportScope(user: Pick<AppSessionUser, "id" | "roles">): Promise<ReportAccessContext> {
  const actorRole = pickActorRole(user.roles); // imported from definitions
  if (!actorRole) throw new ApiError("forbidden", "Недостаточно прав для отчетов", 403);
  // ... full implementation from service.ts lines 234-313
}

export function scopeCacheKey(access: ReportAccessContext) {
  const { scope } = access;
  return [
    access.actorRole,
    scope.studentIds?.join(".") ?? "all-students",
    scope.courseIds?.join(".") ?? "all-courses",
    scope.cohortIds?.join(".") ?? "all-cohorts",
    scope.curatorIds?.join(".") ?? "all-curators",
  ].join(":");
}
```

- [ ] **Step 4: Verify build**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 5: Commit**

### Task 3: Create renderer.ts

**Files:**
- Create: `server/modules/reports/renderer.ts`

Extract from service.ts:
- `RenderedReport` interface
- `countRows()`
- `renderReport()`

```typescript
import { getSafeErrorMetadata } from "@/lib/http";
import { fetchAssignmentData, fetchCertificateData, fetchCuratorWorkloadData,
  fetchProductivityScoreData, fetchProgressData, fetchRiskData,
  fetchFinalCohortData, fetchWeeklyCohortData } from "@/lib/reports/data";
import { generateAssignmentCsv, generateCertificateCsv, generateCuratorWorkloadCsv,
  generateProductivityScoreCsv, generateProgressCsv, generateRiskCsv,
  generateFinalCohortCsv, generateWeeklyCohortCsv } from "@/lib/reports/csv-generator";
import { generateAssignmentXlsx, generateCertificateXlsx, generateCuratorWorkloadXlsx,
  generateProductivityScoreXlsx, generateProgressXlsx, generateRiskXlsx,
  generateFinalCohortXlsx, generateWeeklyCohortXlsx } from "@/lib/reports/xlsx-generator";
import { generateAssignmentPdf, generateCertificatePdf, generateCuratorWorkloadPdf,
  generateProductivityScorePdf, generateProgressPdf, generateRiskPdf,
  generateFinalCohortPdf, generateWeeklyCohortPdf } from "@/lib/reports/pdf-generator";
import type { ReportDataScope, ReportFormat, ReportType } from "@/lib/reports/types";

interface RenderedReport {
  content: string | Buffer | Uint8Array;
  format: ReportFormat;
  fallbackReason?: string;
}

async function countRows(type: ReportType, scope: ReportDataScope): Promise<number> {
  // ... full implementation from service.ts lines 337-359
}

export async function renderReport(type: ReportType, format: ReportFormat, scope: ReportDataScope, fields?: string[]): Promise<RenderedReport> {
  // ... full implementation from service.ts lines 361-503
}
```

- [ ] **Step 6: Verify build**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 7: Commit**

### Task 4: Refactor service.ts

**Files:**
- Modify: `server/modules/reports/service.ts`

Remove all extracted code, import from sub-modules, keep only public API:

```typescript
import { ApiError } from "@/lib/http";
import { cacheGet, cacheSet } from "@/lib/cache";
import { getPrisma } from "@/lib/prisma";
import { QUERY_LIMITS } from "@/lib/query-limits";
import { fetchAssignmentData, /* ... all data fetchers */ } from "@/lib/reports/data";
import { REPORT_DEFINITIONS, assertReportAllowed, normalizeReportType,
  parseReportFormat, pickActorRole, ReportDefinition, EXT } from "@/server/modules/reports/definitions";
import { resolveReportScope, scopeCacheKey, ReportAccessContext } from "@/server/modules/reports/scope";
import { renderReport } from "@/server/modules/reports/renderer";
import type { ReportDataScope, ReportFormat, ReportType } from "@/lib/reports/types";
import type { AppSessionUser, DomainRoleKey } from "@/types/domain";
import { RoleKey } from "@prisma/client";

const prisma = getPrisma();

// ── Display config ──────────────────────────────────────────
const REPORT_ROLE_META: Record<DomainRoleKey, { owner: string; scope: string }> = {
  // ... from service.ts
};

function getReportTypeAlias(role: DomainRoleKey, type: ReportType): string | undefined {
  // ... from service.ts
}

export interface DisplayReportItem {
  // ... from service.ts
}

export function getAvailableReportsForRoles(roles: string[]) {
  // ... unchanged
}

export function getDisplayReportsForRole(roles: string[]): DisplayReportItem[] {
  // ... unchanged
}

export async function generateReportDownload(input: {
  user: Pick<AppSessionUser, "id" | "roles">;
  type: string | null;
  format: ReportFormat;
  fields?: string[];
}): Promise<ReportDownload> {
  // ... unchanged
}

export async function generateReportPreview(input: {
  user: Pick<AppSessionUser, "id" | "roles">;
  type: string | null;
}) {
  // ... unchanged
}

export async function getReportUser(userId: string): Promise<Pick<AppSessionUser, "id" | "roles"> | null> {
  // ... unchanged
}

export async function getStudentReportsDashboardData(studentId: string) {
  // ... unchanged
}
```

- [ ] **Step 8: Remove unreachable throw from service.ts** (the `throw new Error("Unhandled report type/format")` at the end of renderReport — now in renderer.ts)

- [ ] **Step 9: Verify full pipeline**

Run: `npm run verify`
Expected: lint clean, typecheck clean, 936/936 tests pass, build OK

- [ ] **Step 10: Final commit**

- [ ] **Step 11: Update docs/updates.md**

### Task 5 (follow-up): Notification service extraction

Same pattern — split templates + email from notification service.ts.

**Files:**
- Create: `server/modules/notifications/templates.ts`
- Create: `server/modules/notifications/email.ts`
- Modify: `server/modules/notifications/service.ts`

---
