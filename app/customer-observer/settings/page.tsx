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
  title: "Настройки — Наблюдатель",
  description: "Настройки профиля наблюдателя.",
};


const NOTIFICATION_CHANNELS = [
  { key: "customer_course_reports", label: "Отчеты по курсам", desc: "Еженедельная аналитика по прогрессу курса" },
  { key: "customer_new_certificates", label: "Новые сертификаты", desc: "Уведомления о выдаче сертификатов" },
  { key: "customer_technical_notification", label: "Технические уведомления", desc: "Обо всех системных изменениях" },
  { key: "customer_deadline_reminder", label: "Напоминания о сроках", desc: "Напоминания о ближайших дедлайнах" },
];

export const dynamic = "force-dynamic";

export default async function CustomerObserverSettingsPage() {
  await requireRolePage(["customer_observer"]);
  const user = await getCurrentUser();
  const profile = user ? await getProfile(user.id) : null;
  const prefs = await getNotificationPreferencesAction();

 return (
  <AppShell role="customer_observer">
   <PageHeader title="Профиль и настройки" description="Настройки просмотра и оповещений для заказчика."/>
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
            <p className="font-medium">{profile?.name ?? "Заказчик"}</p>
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
             <label htmlFor="company" className="text-sm font-medium">Компания</label>
             <input id="company" name="company" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" defaultValue={profile?.company ?? ""} placeholder="Название компании"/>
           </div>
           <div>
             <label htmlFor="position" className="text-sm font-medium">Должность</label>
             <input id="position" name="position" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" defaultValue={profile?.position ?? ""} placeholder="Должность"/>
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
           <CardDescription>Выберите, какие отчеты и оповещения вы хотите получать.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
           {NOTIFICATION_CHANNELS.map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border p-4">
             <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
             </div>
             <label aria-label={item.label} className="relative inline-flex cursor-pointer items-center">
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
