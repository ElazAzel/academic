import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { getProfile } from "@/server/modules/auth/service";
import { TwoFactorSettings } from "@/components/admin/two-factor-settings";
import {
  updateProfileSettingsAction,
  updatePasswordAction,
  getNotificationPreferencesAction,
  updateNotificationPreferencesAction
} from "@/server/actions/settings";

export const metadata = {
  title: "Настройки — Студент",
  description: "Настройки профиля студента.",
};

const NOTIFICATION_CHANNELS = [
  { key: "curator_reply", label: "Ответы куратора", desc: "Уведомления о новых ответах куратора на ваши вопросы" },
  { key: "module_deadline", label: "Дедлайны модулей", desc: "Предупреждения о приближающихся сроках сдачи модулей" },
  { key: "new_lesson", label: "Новые уроки", desc: "Уведомления о публикации новых материалов в ваших курсах" },
  { key: "assignment_graded", label: "Оценка заданий", desc: "Оповещения о проверке и оценке ваших практических заданий" },
  { key: "email_digest", label: "Email дайджест", desc: "Еженедельная сводка вашей активности и успеваемости на почту" },
  { key: "system_message", label: "Системные сообщения", desc: "Важные технические уведомления от администрации платформы" },
];

export const dynamic = "force-dynamic";

export default async function StudentSettingsPage() {
  await requireRolePage(["student", "admin"]);
  const user = await getCurrentUser();
  const profile = user ? await getProfile(user.id) : null;
  const prefs = await getNotificationPreferencesAction();

  return (
    <AppShell role="student">
      <PageHeader title="Профиль и настройки" description="Настройки аккаунта и уведомлений студента." />
      <Tabs
        tabs={[
          {
            label: "Профиль",
            content: (
              <form action={updateProfileSettingsAction}>
                <Card className="rounded-lg">
                  <CardHeader>
                    <CardTitle className="text-base">Личные данные</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar name={profile?.name ?? ""} className="h-16 w-16 text-lg" />
                      <div>
                        <p className="font-medium">{profile?.name ?? "Слушатель"}</p>
                        <p className="text-sm text-muted-foreground">{profile?.email}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Имя</label>
                        <input
                          name="name"
                          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          defaultValue={profile?.name ?? ""}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <input
                          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          defaultValue={profile?.email}
                          disabled
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Телефон</label>
                        <input
                          name="phone"
                          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          defaultValue={profile?.phone ?? ""}
                          placeholder="+7 (___) ___-__-__"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Организация</label>
                        <input
                          name="organization"
                          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          defaultValue={profile?.organization ?? ""}
                          placeholder="Название организации"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Компания</label>
                        <input
                          name="company"
                          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          defaultValue={profile?.company ?? ""}
                          placeholder="Название компании"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Должность</label>
                        <input
                          name="position"
                          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          defaultValue={profile?.position ?? ""}
                          placeholder="Ваша должность"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit">Сохранить</Button>
                    </div>
                  </CardContent>
                </Card>
              </form>
            ),
          },
          {
            label: "Уведомления",
            content: (
              <form action={updateNotificationPreferencesAction}>
                <Card className="rounded-lg">
                  <CardHeader>
                    <CardTitle className="text-base">Настройки уведомлений</CardTitle>
                    <CardDescription>Выберите, какие уведомления вы хотите получать.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {NOTIFICATION_CHANNELS.map((item) => (
                      <div key={item.key} className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            name={`notification_${item.key}`}
                            defaultChecked={prefs[item.key] !== false}
                            value="true"
                            className="peer sr-only"
                          />
                          <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
                        </label>
                      </div>
                    ))}
                    <div className="flex justify-end">
                      <Button type="submit">Сохранить</Button>
                    </div>
                  </CardContent>
                </Card>
              </form>
            ),
          },
          {
            label: "Безопасность",
            content: (
              <div className="space-y-6">
                <form action={updatePasswordAction}>
                  <Card className="rounded-lg">
                    <CardHeader>
                      <CardTitle className="text-base">Безопасность</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Текущий пароль</label>
                        <input
                          name="currentPassword"
                          type="password"
                          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          placeholder="Текущий пароль"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Новый пароль</label>
                        <input
                          name="newPassword"
                          type="password"
                          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          placeholder="Мин. 10 символов"
                          required
                          minLength={10}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Повторите новый пароль</label>
                        <input
                          name="confirmPassword"
                          type="password"
                          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          placeholder="Повторите пароль"
                          required
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit">Изменить пароль</Button>
                      </div>
                    </CardContent>
                  </Card>
                </form>
                <Card className="rounded-lg">
                  <CardContent className="pt-6">
                    <TwoFactorSettings />
                  </CardContent>
                </Card>
              </div>
            ),
          },
        ]}
      />
    </AppShell>
  );
}
