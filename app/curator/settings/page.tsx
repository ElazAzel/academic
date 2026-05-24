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
import { updateProfileSettingsAction, updatePasswordAction, getNotificationPreferencesAction, updateNotificationPreferencesAction } from "@/server/actions/settings";

export const metadata = {
  title: "Настройки — Куратор",
  description: "Настройки профиля куратора.",
};


const NOTIFICATION_CHANNELS = [
  { key: "curator_new_questions", label: "Новые вопросы", desc: "Уведомления о вопросах от слушателей" },
  { key: "curator_assignment_check", label: "Задания на проверку", desc: "Уведомления о новых отправках заданий" },
  { key: "curator_student_risks", label: "Риски слушателей", desc: "Оповещения о критических рисках" },
  { key: "curator_deadline_reminder", label: "Напоминания по дедлайнам", desc: "Напоминания о сроках модулей" },
  { key: "curator_system_message", label: "Системные сообщения", desc: "Уведомления о технических обновлениях" },
];

export const dynamic = "force-dynamic";

export default async function CuratorSettingsPage() {
  await requireRolePage(["curator", "super_curator"]);
  const user = await getCurrentUser();
  const profile = user ? await getProfile(user.id) : null;
  const prefs = await getNotificationPreferencesAction();

  return (
    <AppShell role="curator">
      <PageHeader title="Профиль и настройки" description="Настройки аккаунта и уведомлений куратора."/>
      <Tabs tabs={[
        {
          label: "Профиль",
          content: (
            <form action={updateProfileSettingsAction}>
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Личные данные</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar name={profile?.name ?? ""} className="h-16 w-16 text-lg"/>
                    <div>
                      <p className="font-medium">{profile?.name ?? "Куратор"}</p>
                      <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    </div>
                  </div>
                  <Separator/>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Имя</label>
                      <input name="name" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue={profile?.name ?? ""}/>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue={profile?.email} disabled/>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Телефон</label>
                      <input name="phone" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue={profile?.phone ?? ""} placeholder="+7 (___) ___-__-__"/>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Организация</label>
                      <input name="organization" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue={profile?.organization ?? ""} placeholder="Название организации"/>
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
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Настройки уведомлений</CardTitle>
                  <CardDescription>Выберите, какие уведомления вы хотите получать.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {NOTIFICATION_CHANNELS.map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-xl border p-4">
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
                          className="peer sr-only"/>
                        <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5"/>
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
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Безопасность</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Текущий пароль</label>
                      <input name="currentPassword" type="password" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Текущий пароль" required/>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Новый пароль</label>
                      <input name="newPassword" type="password" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Мин. 10 символов" required minLength={10}/>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Повторите новый пароль</label>
                      <input name="confirmPassword" type="password" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Повторите пароль" required/>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit">Изменить пароль</Button>
                    </div>
                  </CardContent>
                </Card>
              </form>
              <Card className="rounded-2xl">
                <CardContent className="pt-6">
                  <TwoFactorSettings />
                </CardContent>
              </Card>
            </div>
          ),
        },
      ]}/>
    </AppShell>
  );
}
