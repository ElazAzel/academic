import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export type NotificationChannel = 
  | "in_app"
  | "email"
  | "curator_reply"
  | "module_deadline"
  | "new_lesson"
  | "assignment_graded"
  | "email_digest"
  | "curator_question"
  | "student_submission"
  | "lesson_comment"
  | "deadline_reminder"
  | "system_message";

export interface NotificationPreferenceInput {
  channel: NotificationChannel;
  courseId?: string | null;
  enabled: boolean;
}

export interface UserNotificationPreferences {
  [channel: string]: boolean;
}

/**
 * Get all notification preferences for a user.
 * Returns a map of channel -> enabled.
 */
export async function getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences> {
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId },
  });

  const result: UserNotificationPreferences = {};
  for (const pref of prefs) {
    const key = pref.courseId ? `${pref.channel}:${pref.courseId}` : pref.channel;
    result[key] = pref.enabled;
  }

  return result;
}

/**
 * Set a single notification preference.
 */
export async function setNotificationPreference(
  userId: string,
  channel: NotificationChannel,
  enabled: boolean,
  courseId?: string | null
): Promise<void> {
  await prisma.notificationPreference.upsert({
    where: {
      userId_channel_courseId: {
        userId,
        channel,
        courseId: courseId ?? "",
      },
    },
    update: { enabled },
    create: {
      userId,
      channel,
      courseId,
      enabled,
    },
  });
}

/**
 * Set multiple notification preferences at once.
 */
export async function setNotificationPreferences(
  userId: string,
  preferences: NotificationPreferenceInput[]
): Promise<void> {
  await prisma.$transaction(
    preferences.map((pref) =>
      prisma.notificationPreference.upsert({
        where: {
          userId_channel_courseId: {
            userId,
            channel: pref.channel,
            courseId: pref.courseId ?? "",
          },
        },
        update: { enabled: pref.enabled },
        create: {
          userId,
          channel: pref.channel,
          courseId: pref.courseId,
          enabled: pref.enabled,
        },
      })
    )
  );
}

/**
 * Default notification preferences for new users.
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceInput[] = [
  { channel: "curator_reply", enabled: true },
  { channel: "module_deadline", enabled: true },
  { channel: "new_lesson", enabled: false },
  { channel: "assignment_graded", enabled: true },
  { channel: "email_digest", enabled: false },
  { channel: "curator_question", enabled: true },
  { channel: "student_submission", enabled: true },
  { channel: "lesson_comment", enabled: false },
  { channel: "deadline_reminder", enabled: true },
  { channel: "system_message", enabled: false },
];