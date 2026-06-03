import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const runtimeCopyFiles = [
  "app/admin/popups/client.tsx",
  "app/curator/popups/client.tsx",
  "app/admin/cohorts/[cohortId]/deadline-manager.tsx",
  "app/admin/enrollments/page.tsx",
  "app/instructor/deadlines/client.tsx",
  "components/lms/chat-panel.tsx",
  "components/lms/assignment-block.tsx",
  "components/lms/deadline-action-errors.ts",
  "components/lms/discussion-action-errors.ts",
  "components/lms/deadline-alerts.tsx",
  "components/lms/lesson-discussion.tsx",
  "components/lms/notifications-list.tsx",
  "components/lms/command-palette.tsx",
  "components/lms/notification-preferences-form.tsx",
  "components/lms/settings-forms.tsx",
  "app/student/assignments/[assignmentId]/assignment-view.tsx",
  "components/lms/assignment-upload-errors.ts",
  "components/lms/popup-client-errors.ts",
  "lib/http.ts",
  "lib/media-upload-policy.ts",
  "lib/upload-with-compress.ts",
  "server/actions/chat.ts",
  "app/api/v1/media/upload-fallback/route.ts",
  "app/api/v1/media/uploads/route.ts",
  "app/api/readyz/route.ts",
  "app/api/v1/readyz/route.ts",
  "app/api/v1/payments/checkout/route.ts",
  "app/api/v1/webhooks/stripe/route.ts",
  "app/api/v1/graphql/route.ts",
  "app/api/v1/lessons/[lessonId]/video-playback/route.ts",
  "app/api/v1/lessons/[lessonId]/media/[mediaId]/signed-url/route.ts",
  "app/api/v1/push/subscribe/route.ts",
  "server/modules/billing/service.ts",
  "server/modules/scorm/manifest-parser.ts",
  "server/graphql/resolvers.ts",
];

const forbiddenFallbacks = [
  "Failed to fetch",
  "Failed to load discussion",
  "Upload failed",
  "Unsupported file type",
  "Unsupported storage key",
  "File is too large",
  "File is empty",
  "Storage upload failed",
  "Failed to create",
  "Failed to toggle",
  "Failed to delete",
  "Search failed",
  "Payments are disabled",
  "Stripe webhooks are disabled",
  "Invalid SCORM manifest",
  "SCORM Package",
  "CSRF: missing origin header",
  "CSRF: origin mismatch",
  "CSRF: invalid origin",
  "Database is not reachable",
  "Student id is required",
  "Students can only open their own chat",
  "Student is not assigned to this curator",
  "Receiver id is required",
  "Unauthorized",
  "GraphQL scaffold:",
  "GraphQL runtime is scaffolded",
  "GraphQL runtime",
  "Use REST endpoints for MVP",
  "REST endpoints MVP",
  "Lesson not found",
  "No active enrollment",
  "Sequential lock: previous required lessons not completed",
  "Media does not belong to lesson",
  "Repeated signed URL requests",
  'reason: "unauthenticated"',
  'toast.error(err instanceof Error ? err.message : "Ошибка при сохранении")',
  'toast.error(err instanceof Error ? err.message : "Ошибка при обновлении профиля")',
  'toast.error(err instanceof Error ? err.message : "Ошибка при изменении пароля")',
  'toast.error(err instanceof Error ? err.message : "Ошибка сети при загрузке файла")',
  "toast.error(err.message)",
  'toast.error(`Ошибка: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`)',
];

describe("Russian-first runtime fallback copy", () => {
  it("does not expose common English fallback errors in runtime files", () => {
    for (const file of runtimeCopyFiles) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");

      for (const fallback of forbiddenFallbacks) {
        expect(source, `${file} contains '${fallback}'`).not.toContain(fallback);
      }
    }
  });
});
