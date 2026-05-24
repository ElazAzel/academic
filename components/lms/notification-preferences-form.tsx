"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface UserNotificationPreferences {
  [channel: string]: boolean;
}

const CHANNEL_LABELS: Record<string, string> = {
  curator_reply: "Ответ куратора",
  module_deadline: "Дедлайны модулей",
  new_lesson: "Новые уроки",
  assignment_graded: "Оценка задания",
  email_digest: "Email-дайджест",
  curator_question: "Вопрос куратору",
  student_submission: "Ответ студента",
  lesson_comment: "Комментарии к уроку",
  deadline_reminder: "Напоминание о дедлайне",
  system_message: "Системные сообщения",
};

const DISPLAY_CHANNELS = Object.keys(CHANNEL_LABELS);

export function NotificationPreferencesForm() {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery<UserNotificationPreferences>({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/v1/notification-preferences");
      if (!res.ok) throw new Error("Не удалось загрузить настройки");
      const json = await res.json();
      return json.data ?? {};
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ channel, enabled }: { channel: string; enabled: boolean }) => {
      const res = await fetch("/api/v1/notification-preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ preferences: [{ channel, enabled }] }),
      });
      if (!res.ok) throw new Error("Не удалось сохранить настройку");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Настройка сохранена");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Ошибка при сохранении");
    },
  });

  if (isLoading) {
    return (
      <Card className="rounded-lg">
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {DISPLAY_CHANNELS.map((channel) => (
              <div key={channel} className="flex items-center justify-between rounded-lg border p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-9 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg">
      <CardContent className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {DISPLAY_CHANNELS.map((channel) => {
            const enabled = preferences?.[channel] ?? false;
            return (
              <div key={channel} className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor={`pref-${channel}`} className="cursor-pointer text-sm font-medium">
                  {CHANNEL_LABELS[channel]}
                </Label>
                <Switch
                  id={`pref-${channel}`}
                  checked={enabled}
                  onCheckedChange={(checked) => {
                    updateMutation.mutate({ channel, enabled: checked });
                  }}
                  disabled={updateMutation.isPending}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
