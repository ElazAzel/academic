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
  title: "Настройки — Супер-куратор",
  description: "Настройки профиля супер-куратора.",
};


const NOTIFICATION_CHANNELS = [
  { key: "super_curator_applications", label: "Новые заявки кураторов", desc: "Уведомления о новых кандидатурах" },
  { key: "super_curator_flow_reports", label: "Отчеты по потокам", desc: "Получать сводки о работе кураторов" },
  { key: "super_curator_system_message", label: "Системные сообщения", desc: "Уведомления о технических обновлениях" },
  { key: "super_curator_deadline_reminder", label: "Напоминания по дедлайнам", desc: "Напоминания о важных сроках" },
];

export const dynamic = "force-dynamic";

export default async function SuperCuratorSettingsPage() {
  await requireRolePage(["super_curator"]);
  const user = await getCurrentUser();
  const profile = user ? await getProfile(user.id) : null;
  const prefs = await getNotificationPreferencesAction();

 return (
  <AppShell role="super_curator">
   <PageHeader title="Профиль и настройки" description="Настройки аккаунта и уведомлений супер-куратора."/>
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
           <Avatar name={profile?.name ?? ""} className="h-16 w-16 text-lg"/>
           <div>
            <p className="font-medium">{profile?.name ?? "Супер-куратор"}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
           </div>
          </div>
          <Separator/>
          <div className="grid gap-4 sm:grid-cols-2">
           <div>
             <label htmlFor="name" className="text-sm font-medium">Имя</label>
             <input id="name" name="name" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" defaultValue={profile?.name ?? ""}/>
           </div>
           <div>
             <label htmlFor="email" className="text-sm font-medium">Email</label>
             <input id="email" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" defaultValue={profile?.email} disabled/>
           </div>
           <div>
             <label htmlFor="phone" className="text-sm font-medium">Телефон</label>
             <input id="phone" name="phone" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" defaultValue={profile?.phone ?? ""} placeholder="+7 (___) ___-__-__"/>
           </div>
           <div>
             <label htmlFor="organization" className="text-sm font-medium">Организация</label>
             <input id="organization" name="organization" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" defaultValue={profile?.organization ?? ""} placeholder="Название организации"/>
           </div>
          </div>
          <div className="flex justify-end">
           <Button type="submit">Сохранить</Button>
          </div>
         </CardContent>
        </Card>
       </form>
      )
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
             <label aria-label={item.label} className="relative inline-flex cursor-pointer items-center">
               <input type="hidden" name={`notification_${item.key}`} value="false" />
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
       )
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
              <label htmlFor="currentPassword" className="text-sm font-medium">Текущий пароль</label>
              <input id="currentPassword" name="currentPassword" type="password" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Текущий пароль" required/>
             </div>
             <div>
              <label htmlFor="newPassword" className="text-sm font-medium">Новый пароль</label>
              <input id="newPassword" name="newPassword" type="password" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Мин. 10 символов" required minLength={10}/>
             </div>
             <div>
              <label htmlFor="confirmPassword" className="text-sm font-medium">Повторите новый пароль</label>
              <input id="confirmPassword" name="confirmPassword" type="password" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Повторите пароль" required/>
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
       )
      }
    ]}
  />
  </AppShell>
 );
}
