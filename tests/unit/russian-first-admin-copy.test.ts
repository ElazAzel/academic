import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const adminCopyFiles = [
  "app/admin/settings/page.tsx",
  "app/admin/glossary/glossary-editor.tsx",
  "app/admin/cohorts/new/create-cohort-form.tsx",
  "app/admin/cohorts/[cohortId]/edit-cohort-form.tsx",
  "app/super-curator/cohorts/[id]/add-student-form.tsx",
  "app/super-curator/cohorts/cohort-form.tsx",
  "app/super-curator/curators/add-curator-form.tsx",
  "app/super-curator/distribution/assign-curator-form.tsx",
  "app/super-curator/risks/risk-actions.tsx",
  "app/instructor/settings/page.tsx",
  "app/instructor/attendance/client.tsx",
  "components/admin/certificate-designer.tsx",
  "components/admin/certificates-dashboard.tsx",
  "components/admin/create-user-modal.tsx",
  "components/admin/delete-enrollment-button.tsx",
  "components/admin/edit-user-dialog.tsx",
  "components/admin/enroll-student-form.tsx",
  "components/admin/user-batch-importer.tsx",
  "components/admin/visit-analytics-block.tsx",
  "components/lms/workspace-page.tsx",
];

const forbiddenVisibleLabels = [
  "Bypass progress requirements",
  "Feature Flags",
  "Email & SMTP",
  "SMTP Host",
  "SMTP Port",
  ">MVP</",
  "production scaffold",
  "REST-контракт",
  "server modules",
  "React Query",
  "прямого доступа UI",
  "loadError = error instanceof Error ? error.message",
  "return error instanceof Error ? error.message : fallback;",
  "<TableHead>Email</TableHead>",
  ">Email</label>",
];

const fileSpecificForbiddenLabels: Record<string, string[]> = {
  "app/admin/glossary/glossary-editor.tsx": [
    'toast.error(err instanceof Error ? err.message : "Ошибка")',
  ],
  "app/admin/cohorts/new/create-cohort-form.tsx": [
    'toast.error(err instanceof Error ? err.message : "Ошибка")',
  ],
  "app/admin/cohorts/[cohortId]/edit-cohort-form.tsx": [
    'toast.error(err instanceof Error ? err.message : "Ошибка")',
  ],
  "app/super-curator/cohorts/cohort-form.tsx": [
    'toast.error(err instanceof Error ? err.message : "Ошибка")',
  ],
  "app/super-curator/cohorts/[id]/add-student-form.tsx": [
    'toast.error(err instanceof Error ? err.message : "Ошибка")',
  ],
  "app/super-curator/curators/add-curator-form.tsx": [
    'toast.error(err instanceof Error ? err.message : "Ошибка")',
  ],
  "app/super-curator/distribution/assign-curator-form.tsx": [
    'toast.error(err instanceof Error ? err.message : "Ошибка")',
  ],
  "app/super-curator/risks/risk-actions.tsx": [
    'toast.error(err instanceof Error ? err.message : "Ошибка")',
    'toast.error("Ошибка")',
  ],
  "components/admin/edit-user-dialog.tsx": [
    'toast.error(err instanceof Error ? err.message : "Ошибка")',
  ],
  "components/admin/create-user-modal.tsx": [
    'setError(err instanceof Error ? err.message : "Ошибка при создании")',
  ],
  "components/admin/delete-enrollment-button.tsx": [
    'toast.error(err instanceof Error ? err.message : "Ошибка при удалении")',
  ],
  "components/admin/enroll-student-form.tsx": [
    'setError(err instanceof Error ? err.message : "Произошла ошибка")',
  ],
};

describe("Russian-first admin and instructor visible copy", () => {
  it("does not expose selected English labels in operational screens", () => {
    for (const file of adminCopyFiles) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");

      for (const label of forbiddenVisibleLabels) {
        expect(source, `${file} contains '${label}'`).not.toContain(label);
      }

      for (const label of fileSpecificForbiddenLabels[file] ?? []) {
        expect(source, `${file} contains '${label}'`).not.toContain(label);
      }
    }
  });
});
