import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { updateProfileSettingsAction, updatePasswordAction, getAppSettingsAction, updateAppSettingsAction, incrementBuildVersionAction } from "@/server/actions/settings";
import { TwoFactorSettings } from "@/components/admin/two-factor-settings";

const FEATURE_FLAGS = [
  { key: "FEATURE_PUSH_NOTIFICATIONS", label: "Push-уведомления" },
  { key: "FEATURE_GRAPHQL", label: "GraphQL API" },
];

export default async function AdminSettingsPage() {
  await requireRolePage(["admin"]);
  const user = await getCurrentUser();
  const appSettings = await getAppSettingsAction();

 return (
  <AppShell role="admin">
   <PageHeader title="Настройки платформы" description="Feature flags, интеграции, уведомления и безопасность."/>
   <Tabs tabs={[
    {
     label: "Профиль",
     content: (
      <form action={updateProfileSettingsAction}>
       <Card className="rounded-2xl">
        <CardHeader>
         <CardTitle className="text-headline-sm">Личные данные</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
         <div className="flex items-center gap-4">
          <Avatar name={user?.name ?? ""} className="h-16 w-16 text-lg"/>
          <div>
           <p className="font-medium">{user?.name ?? "Администратор"}</p>
           <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
         </div>
         <Separator/>
         <div className="grid gap-4 sm:grid-cols-2">
          <div>
           <label className="text-sm font-medium">Имя</label>
           <Input name="name" className="mt-1" defaultValue={user?.name ?? ""}/>
          </div>
          <div>
           <label className="text-sm font-medium">Email</label>
           <Input className="mt-1" defaultValue={user?.email} disabled/>
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
     label: "Безопасность",
     content: (
       <div>
        <form action={updatePasswordAction}>
         <Card className="rounded-2xl">
          <CardHeader>
           <CardTitle className="text-headline-sm">Безопасность</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
           <div>
            <label className="text-sm font-medium">Текущий пароль</label>
            <Input name="currentPassword" type="password" className="mt-1" placeholder="Текущий пароль" required/>
           </div>
           <div>
            <label className="text-sm font-medium">Новый пароль</label>
            <Input name="newPassword" type="password" className="mt-1" placeholder="Мин. 10 символов" required minLength={10}/>
           </div>
           <div>
            <label className="text-sm font-medium">Повторите новый пароль</label>
            <Input name="confirmPassword" type="password" className="mt-1" placeholder="Повторите пароль" required/>
           </div>
           <div className="flex justify-end">
            <Button type="submit">Изменить пароль</Button>
           </div>
          </CardContent>
         </Card>
        </form>
        <TwoFactorSettings />
       </div>
     ),
    },
{
      label: "Feature Flags",
      content: (
       <form action={updateAppSettingsAction}>
        <Card className="rounded-2xl">
         <CardHeader>
          <div className="flex items-center gap-2">
           <Icon name="flag" className="text-m3-primary" size={20} />
           <CardTitle className="text-headline-sm">Feature Flags</CardTitle>
          </div>
          <CardDescription>Включение/отключение функций платформы.</CardDescription>
         </CardHeader>
         <CardContent className="space-y-3">
          {FEATURE_FLAGS.map((f) => (
           <div key={f.key} className="flex items-center justify-between rounded-xl border p-4">
            <div>
             <p className="text-sm font-medium">{f.label}</p>
             <code className="text-xs text-muted-foreground">{f.key}</code>
            </div>
            <Switch
              name={`setting_${f.key}`}
              defaultChecked={appSettings[f.key] === true}
              value="true"
            />
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
      label: "Уведомления",
      content: (
       <form action={updateAppSettingsAction}>
        <Card className="rounded-2xl">
         <CardHeader>
          <div className="flex items-center gap-2">
           <Icon name="mail" className="text-m3-primary" size={20} />
           <CardTitle className="text-headline-sm">Email & SMTP</CardTitle>
          </div>
         </CardHeader>
         <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
           <div>
            <label className="text-sm font-medium">SMTP Host</label>
            <Input
              name="setting_SMTP_HOST"
              className="mt-1"
              defaultValue={appSettings.SMTP_HOST as string ?? "localhost"}/>
           </div>
           <div>
            <label className="text-sm font-medium">SMTP Port</label>
            <Input
              name="setting_SMTP_PORT"
              className="mt-1"
              defaultValue={appSettings.SMTP_PORT as string ?? "1025"}/>
           </div>
           <div className="sm:col-span-2">
            <label className="text-sm font-medium">От кого</label>
            <Input
              name="setting_SMTP_FROM"
              className="mt-1"
              defaultValue={appSettings.SMTP_FROM as string ?? "AI Strategic Academy <noreply@example.com>"}/>
           </div>
          </div>
          <Button type="submit">Сохранить</Button>
         </CardContent>
        </Card>
       </form>
      ),
     },
    {
      label: "Сертификаты",
      content: (
       <form action={updateAppSettingsAction}>
        <Card className="rounded-2xl">
         <CardHeader>
          <div className="flex items-center gap-2">
           <Icon name="verified" className="text-m3-primary" size={20} />
           <CardTitle className="text-headline-sm">Параметры сертификации</CardTitle>
          </div>
         </CardHeader>
         <CardContent className="space-y-4">
          <div>
           <label className="text-sm font-medium">Порог завершения для сертификата (%)</label>
           <Input
             name="setting_CERTIFICATE_COMPLETION_THRESHOLD"
             type="number"
             className="mt-1 max-w-[200px]"
             defaultValue={appSettings.CERTIFICATE_COMPLETION_THRESHOLD as number ?? 85}/>
          </div>
          <Button type="submit">Сохранить</Button>
         </CardContent>
        </Card>
       </form>
      ),
     },
    {
      label: "Кэш",
      content: (
       <Card className="rounded-2xl">
        <CardHeader>
         <div className="flex items-center gap-2">
          <Icon name="refresh" className="text-m3-primary" size={20} />
          <CardTitle className="text-headline-sm">Сброс кэша</CardTitle>
         </div>
         <CardDescription>
           При сбросе кэша все пользователи получат обновлённые стили и код.
           Прогресс обучения и история чатов не затрагиваются.
         </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
         <div className="rounded-xl border bg-m3-surface-container-high px-4 py-3">
          <p className="text-sm">
           Текущая версия сборки: <strong className="font-semibold">{appSettings.BUILD_VERSION as number ?? 1}</strong>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
           При нажатии версия увеличится, и сервис-воркер обновит кэш у всех пользователей.
          </p>
         </div>
         <form action={incrementBuildVersionAction}>
          <Button type="submit" variant="danger">
           <Icon name="refresh" size={16} className="mr-1" />
           Сбросить кэш и обновить версию
          </Button>
         </form>
        </CardContent>
       </Card>
      ),
     },
    ]}/>
  </AppShell>
 );
}
