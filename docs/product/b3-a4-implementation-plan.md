# B3 + A4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Productivity Score distribution chart to observer reports page (B3) + prepare SMTP for production (A4)

**Architecture:**
- B3: Server Action → Client Component (recharts PieChart) → Observer reports page
- A4: Transporter config hardening → Admin UI feature flag → Documentation

**Tech Stack:** Next.js 16, Server Actions, recharts, nodemailer, shadcn/ui

---

## File Structure

### B3: Productivity Score Distribution
- **Create:** `server/actions/reports/productivity-distribution.ts` — Server Action, scoped aggregation
- **Create:** `components/lms/productivity-distribution-card.tsx` — Client component with recharts PieChart
- **Modify:** `app/customer-observer/reports/page.tsx` — Integrate card above ReportDesigner
- **Create:** `tests/unit/productivity-distribution.test.ts` — Tests for Server Action

### A4: SMTP Production Wiring
- **Modify:** `server/modules/notifications/service.ts` — Transporter hardening (pool, timeouts, logger)
- **Modify:** `app/admin/settings/page.tsx` — Add FEATURE_EMAIL_NOTIFICATIONS flag
- **Modify:** `.env.example` — Uncomment + document SMTP section
- **Modify:** `docs/deployment.md` — Add SMTP setup section

---

## B3 Tasks

### Task 1: Server Action — getProductivityDistribution

**Files:**
- Create: `server/actions/reports/productivity-distribution.ts`
- Test: `tests/unit/productivity-distribution.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/productivity-distribution.test.ts
import { describe, it, expect, vi } from "vitest";
import { getProductivityDistribution } from "@/server/actions/reports/productivity-distribution";
import { ProductivityLevel } from "@/server/modules/productivity-score/service";

// Mock calculateForUser
vi.mock("@/server/modules/productivity-score/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/modules/productivity-score/service")>();
  return {
    ...actual,
    calculateForUser: vi.fn(),
  };
});

// Mock observer scope
vi.mock("@/server/modules/observer/scope", () => ({
  getScopedStudentIdsForObserver: vi.fn(),
}));

describe("getProductivityDistribution", () => {
  it("returns aggregated distribution by level", async () => {
    const { calculateForUser } = await import("@/server/modules/productivity-score/service");
    const mockUser = { id: "obs-1", role: "customer_observer" } as any;

    vi.mocked(calculateForUser).mockResolvedValueOnce({
      totalScore: 95, level: "champion" as ProductivityLevel,
      testsScore: 90, assignmentsScore: 95, finalProjectScore: 98, activityScore: 88, diagnosticsScore: 0,
      components: {}, overallScore: 0,
    });
    vi.mocked(calculateForUser).mockResolvedValueOnce({
      totalScore: 75, level: "advanced" as ProductivityLevel,
      testsScore: 70, assignmentsScore: 80, finalProjectScore: 0, activityScore: 65, diagnosticsScore: 0,
      components: {}, overallScore: 0,
    });
    vi.mocked(calculateForUser).mockResolvedValueOnce({
      totalScore: 45, level: "practitioner" as ProductivityLevel,
      testsScore: 40, assignmentsScore: 50, finalProjectScore: 0, activityScore: 30, diagnosticsScore: 0,
      components: {}, overallScore: 0,
    });

    const result = await getProductivityDistribution(mockUser, {
      type: "cohort",
      cohortId: "coh-1",
      courseIds: ["course-1"],
      studentIds: ["s1", "s2", "s3"],
      organizationId: undefined,
    });

    expect(result).not.toBeNull();
    expect(result!.totalStudents).toBe(3);
    expect(result!.averageScore).toBeCloseTo(71.67, 1);
    expect(result!.levels).toContainEqual({ level: "champion", count: 1, percentage: 33.33 });
    expect(result!.levels).toContainEqual({ level: "advanced", count: 1, percentage: 33.33 });
    expect(result!.levels).toContainEqual({ level: "practitioner", count: 1, percentage: 33.33 });
  });

  it("returns null for empty student list", async () => {
    const result = await getProductivityDistribution(
      { id: "obs-1", role: "customer_observer" } as any,
      { type: "cohort", cohortId: "empty", courseIds: [], studentIds: [], organizationId: undefined },
    );
    expect(result).toBeNull();
  });

  it("handles partial failures gracefully", async () => {
    const { calculateForUser } = await import("@/server/modules/productivity-score/service");
    vi.mocked(calculateForUser).mockResolvedValueOnce({
      totalScore: 90, level: "champion" as ProductivityLevel,
      testsScore: 90, assignmentsScore: 90, finalProjectScore: 90, activityScore: 90, diagnosticsScore: 0,
      components: {}, overallScore: 0,
    });
    vi.mocked(calculateForUser).mockRejectedValueOnce(new Error("calc failed"));
    vi.mocked(calculateForUser).mockResolvedValueOnce({
      totalScore: 50, level: "practitioner" as ProductivityLevel,
      testsScore: 50, assignmentsScore: 50, finalProjectScore: 0, activityScore: 50, diagnosticsScore: 0,
      components: {}, overallScore: 0,
    });

    const result = await getProductivityDistribution(
      { id: "obs-1", role: "customer_observer" } as any,
      { type: "cohort", cohortId: "coh-2", courseIds: ["course-1"], studentIds: ["s1", "s2", "s3"], organizationId: undefined },
    );
    // Should skip the failed student, still return aggregate for others
    expect(result).not.toBeNull();
    expect(result!.totalStudents).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest tests/unit/productivity-distribution.test.ts --reporter=verbose`
Expected: FAIL — "Cannot find module" or similar (file doesn't exist yet)

- [ ] **Step 3: Write Server Action implementation**

```ts
// server/actions/reports/productivity-distribution.ts
"use server";

import { requireAuth } from "@/lib/auth";
import { calculateForUser } from "@/server/modules/productivity-score/service";
import { getScopedStudentIdsForObserver } from "@/server/modules/observer/scope";
import type { ProductivityLevel } from "@/server/modules/productivity-score/service";

interface ProductivityLevelCount {
  level: ProductivityLevel;
  count: number;
  percentage: number;
}

export interface ProductivityDistribution {
  levels: ProductivityLevelCount[];
  averageScore: number;
  totalStudents: number;
}

interface ReportScope {
  type: string;
  cohortId?: string;
  courseIds: string[];
  studentIds: string[];
  organizationId?: string;
}

export async function getProductivityDistribution(
  actor: { id: string; role: string },
  scope: ReportScope,
): Promise<ProductivityDistribution | null> {
  const studentIds = actor.role === "customer_observer"
    ? await getScopedStudentIdsForObserver(actor.id)
    : scope.studentIds;

  if (!studentIds.length) return null;

  const levelCounts: Record<ProductivityLevel, number> = {
    champion: 0, advanced: 0, practitioner: 0, beginner: 0,
  };
  let totalScore = 0;
  let processedCount = 0;

  for (const studentId of studentIds) {
    try {
      for (const courseId of scope.courseIds) {
        const result = await calculateForUser(actor, studentId, courseId);
        levelCounts[result.level]++;
        totalScore += result.totalScore;
        processedCount++;
      }
    } catch (err) {
      console.error(`Failed to calculate score for student ${studentId}:`, err);
    }
  }

  if (!processedCount) return null;

  const averageScore = Math.round((totalScore / processedCount) * 100) / 100;
  const levels: ProductivityLevelCount[] = (Object.entries(levelCounts) as [ProductivityLevel, number][])
    .filter(([, count]) => count > 0)
    .map(([level, count]) => ({
      level,
      count,
      percentage: Math.round((count / processedCount) * 10000) / 100,
    }));

  return { levels, averageScore, totalStudents: processedCount };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest tests/unit/productivity-distribution.test.ts --reporter=verbose`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add server/actions/reports/productivity-distribution.ts tests/unit/productivity-distribution.test.ts
git commit -m "feat: add getProductivityDistribution server action with tests"
```

---

### Task 2: ProductivityDistributionCard component

**Files:**
- Create: `components/lms/productivity-distribution-card.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/lms/productivity-distribution-card.tsx
"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DistributionPieChart } from "@/components/charts/distribution-pie-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { getProductivityDistribution } from "@/server/actions/reports/productivity-distribution";
import type { ProductivityDistribution } from "@/server/actions/reports/productivity-distribution";

interface ProductivityDistributionCardProps {
  scope: {
    type: string;
    cohortId?: string;
    courseIds: string[];
    studentIds: string[];
    organizationId?: string;
  };
}

const LEVEL_COLORS: Record<string, string> = {
  champion: "#22c55e",
  advanced: "#3b82f6",
  practitioner: "#f59e0b",
  beginner: "#ef4444",
};

const LEVEL_LABELS: Record<string, string> = {
  champion: "Champion",
  advanced: "Advanced",
  practitioner: "Practitioner",
  beginner: "Beginner",
};

export function ProductivityDistributionCard({ scope }: ProductivityDistributionCardProps) {
  const [data, setData] = useState<ProductivityDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(false);
        const result = await getProductivityDistribution({} as any, scope);
        if (!cancelled) {
          setData(result);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [scope]);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Распределение Productivity Score</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Skeleton className="w-full h-full rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader><CardTitle>Распределение Productivity Score</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {error ? "Ошибка загрузки данных" : "Нет данных для отображения."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const pieData = data.levels.map((l) => ({
    name: LEVEL_LABELS[l.level] || l.level,
    value: l.count,
    color: LEVEL_COLORS[l.level] || "#6b7280",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Распределение Productivity Score</CardTitle>
        <p className="text-sm text-muted-foreground">
          Средний балл: {data.averageScore} · {data.totalStudents} студентов
        </p>
      </CardHeader>
      <CardContent>
        <DistributionPieChart data={pieData} />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add components/lms/productivity-distribution-card.tsx
git commit -m "feat: add ProductivityDistributionCard component with pie chart"
```

---

### Task 3: Integrate into observer reports page

**Files:**
- Modify: `app/customer-observer/reports/page.tsx`

- [ ] **Step 1: Read current page**

```bash
Get-Content -LiteralPath "app/customer-observer/reports/page.tsx" | Select-Object -First 80
```

- [ ] **Step 2: Add ProductivityDistributionCard after BarChart section**

Read the current file to see the exact structure, then add the card after the cohort progress BarChart section and before the ReportDesigner section.

The integration point is after the `{data.cohorts.length > 0 && (... BarChart ...)}` block and before the `<div className="mt-8 space-y-6">` (ReportDesigner section).

Edit:
```tsx
// After the BarChart section and before ReportDesigner section, add:
{data.cohorts.length > 0 && (
  <ProductivityDistributionCard scope={{
    type: "cohort",
    cohortId: data.cohorts[0]?.id,
    courseIds: data.cohorts.map(c => c.courseId).filter(Boolean),
    studentIds: [],
    organizationId: undefined,
  }} />
)}
```

Also add the import at the top:
```tsx
import { ProductivityDistributionCard } from "@/components/lms/productivity-distribution-card";
```

- [ ] **Step 3: Verify build**

Run: `npm run lint`
Expected: 0 errors, 0 warnings

Run: `npm run typecheck` (via `tsc --noEmit` or `npm run build`)

- [ ] **Step 4: Commit**

```bash
git add app/customer-observer/reports/page.tsx
git commit -m "feat: integrate ProductivityDistributionCard into observer reports page"
```

---

## A4 Tasks

### Task 4: Transporter hardening

**Files:**
- Modify: `server/modules/notifications/service.ts`

- [ ] **Step 1: Read current transporter config**

```bash
Get-Content -LiteralPath "server/modules/notifications/service.ts"
```

- [ ] **Step 2: Update transporter with production-ready options**

Edit the `createTransport` call to add:
- `pool: true`
- `maxConnections: 5`
- `connectionTimeout: 10000`
- `greetingTimeout: 5000`
- `logger: true`

Old:
```ts
nodemailerTransporter = nodemailer.default.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD ?? "",
  } : undefined,
});
```

New:
```ts
nodemailerTransporter = nodemailer.default.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  pool: true,
  maxConnections: 5,
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  logger: true,
  auth: env.SMTP_USER ? {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD ?? "",
  } : undefined,
});
```

- [ ] **Step 3: Verify tests still pass**

Run: `npx vitest tests/unit/notifications-service.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/modules/notifications/service.ts
git commit -m "perf: harden SMTP transporter with pooling, timeouts, and logging"
```

---

### Task 5: Admin UI feature flag

**Files:**
- Modify: `app/admin/settings/page.tsx`

- [ ] **Step 1: Read current FEATURE_FLAGS array**

```bash
rg "FEATURE_FLAGS" "app/admin/settings/page.tsx" -A 30
```

- [ ] **Step 2: Add FEATURE_EMAIL_NOTIFICATIONS to the FEATURE_FLAGS array**

Find the array that contains FEATURE_PUSH_NOTIFICATIONS and add after it:

```tsx
{
  key: "FEATURE_EMAIL_NOTIFICATIONS",
  label: "Email-уведомления",
  description: "Отправка email-уведомлений через SMTP",
},
```

- [ ] **Step 3: Verify build**

Run: `npm run lint`
Expected: 0 errors, 0 warnings

- [ ] **Step 4: Commit**

```bash
git add app/admin/settings/page.tsx
git commit -m "feat: add FEATURE_EMAIL_NOTIFICATIONS toggle to admin settings"
```

---

### Task 6: SMTP documentation

**Files:**
- Modify: `.env.example`
- Modify: `docs/deployment.md`

- [ ] **Step 1: Update .env.example**

Find the commented SMTP section and replace with working config:

```env
# SMTP — для отправки email-уведомлений.
# В production: установите FEATURE_EMAIL_NOTIFICATIONS=true и настройте SMTP.
FEATURE_EMAIL_NOTIFICATIONS=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM="AI Strategic Academy <noreply@example.com>"
```

- [ ] **Step 2: Update deployment docs**

Read current `docs/deployment.md` (if exists), or create if missing. Add section:

```markdown
## Настройка SMTP

1. Установите переменные окружения (см. `.env.example` → секция SMTP)
2. Включите `FEATURE_EMAIL_NOTIFICATIONS` в Admin UI: Настройки → Уведомления → Email-уведомления
3. Проверьте отправку: запросите сброс пароля — письмо придёт на email пользователя

**Требования к SMTP-серверу:**
- Поддержка STARTTLS (порт 587) или SSL (порт 465)
- Аутентификация по логину/паролю (не требуется для локального релея)

**Рекомендации:**
- Для высоких нагрузок увеличьте `maxConnections` в `server/modules/notifications/service.ts`
- DKIM/SPF/DMARC настройте на уровне SMTP-провайдера
```

- [ ] **Step 3: Commit**

```bash
git add .env.example docs/deployment.md
git commit -m "docs: add SMTP production configuration guide"
```

---

## Final Verification

- [ ] **Full test suite**: `npx vitest run` — 933+ tests passing
- [ ] **Lint**: `npm run lint` — 0 errors, 0 warnings
- [ ] **Build**: `npm run build` — production build successful

---
