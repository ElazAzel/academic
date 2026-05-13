import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Flag, Mail, Shield } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { updateProfileSettingsAction, updatePasswordAction, getAppSettingsAction, updateAppSettingsAction } from "@/server/actions/settings";

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
         <CardTitle className="text-base">Личные данные</CardTitle>
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
           <input name="name" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue={user?.name ?? ""}/>
          </div>
          <div>
           <label className="text-sm font-medium">Email</label>
           <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue={user?.email} disabled/>
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
     ),
    },
{
      label: "Feature Flags",
      content: (
       <form action={updateAppSettingsAction}>
        <Card className="rounded-2xl">
         <CardHeader>
          <div className="flex items-center gap-2">
           <Flag className="h-5 w-5 text-primary"/>
           <CardTitle className="text-base">Feature Flags</CardTitle>
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
            <label className="relative inline-flex cursor-pointer items-center">
             <input 
               type="checkbox" 
               name={`setting_${f.key}`} 
               defaultChecked={appSettings[f.key] === true} 
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
      label: "Уведомления",
      content: (
       <form action={updateAppSettingsAction}>
        <Card className="rounded-2xl">
         <CardHeader>
          <div className="flex items-center gap-2">
           <Mail className="h-5 w-5 text-primary"/>
           <CardTitle className="text-base">Email & SMTP</CardTitle>
          </div>
         </CardHeader>
         <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
           <div>
            <label className="text-sm font-medium">SMTP Host</label>
            <input 
              name="setting_SMTP_HOST" 
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" 
              defaultValue={appSettings.SMTP_HOST as string ?? "localhost"}/>
           </div>
           <div>
            <label className="text-sm font-medium">SMTP Port</label>
            <input 
              name="setting_SMTP_PORT" 
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" 
              defaultValue={appSettings.SMTP_PORT as string ?? "1025"}/>
           </div>
           <div className="sm:col-span-2">
            <label className="text-sm font-medium">От кого</label>
            <input 
              name="setting_SMTP_FROM" 
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" 
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
           <Shield className="h-5 w-5 text-primary"/>
           <CardTitle className="text-base">Параметры сертификации</CardTitle>
          </div>
         </CardHeader>
         <CardContent className="space-y-4">
          <div>
           <label className="text-sm font-medium">Порог завершения для сертификата (%)</label>
           <input 
             name="setting_CERTIFICATE_COMPLETION_THRESHOLD" 
             type="number" 
             className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm max-w-[200px]" 
             defaultValue={appSettings.CERTIFICATE_COMPLETION_THRESHOLD as number ?? 85}/>
          </div>
          <Button type="submit">Сохранить</Button>
         </CardContent>
        </Card>
       </form>
      ),
     },
   ]}/>
  </AppShell>
 );
}
