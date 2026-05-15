import { z } from "zod";
import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getUserNotificationPreferences, setNotificationPreferences } from "@/server/modules/notifications/preferences";

const NotificationChannelEnum = z.enum([
  "in_app", "email", "curator_reply", "module_deadline", "new_lesson",
  "assignment_graded", "email_digest", "curator_question", "student_submission",
  "lesson_comment", "deadline_reminder", "system_message",
]);

const upsertNotificationPreferenceSchema = z.object({
  channel: NotificationChannelEnum,
  enabled: z.boolean(),
  courseId: z.string().nullable().optional(),
});

const updatePreferencesSchema = z.object({
  preferences: z.array(upsertNotificationPreferenceSchema),
});

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getUserNotificationPreferences(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, updatePreferencesSchema);
    await setNotificationPreferences(user.id, body.preferences);
    return ok(await getUserNotificationPreferences(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
