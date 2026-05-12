import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { updateProfileSettingsAction, updatePasswordAction } from "@/server/actions/settings";

export default async function SuperCuratorSettingsPage() {
 await requireRolePage(["super_curator"]);
 const user = await getCurrentUser();

 return (
  <AppShell role="super_curator">
   <PageHeader title="Профиль и настройки" description="Настройки аккаунта и уведомлений супер-куратора."/>
   <Tabs
    tabs={[
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
            <p className="font-medium">{user?.name ?? "Супер-куратор"}</p>
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
           <div>
            <label className="text-sm font-medium">Телефон</label>
            <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="+7 (___) ___-__-__"/>
           </div>
           <div>
            <label className="text-sm font-medium">Организация</label>
            <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Название организации"/>
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
       <Card className="rounded-2xl">
        <CardHeader>
         <CardTitle className="text-base">Настройки уведомлений</CardTitle>
         <CardDescription>Выберите, какие уведомления вы хотите получать.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
         {[
          { label: "Новые заявки кураторов", desc: "Уведомления о новых кандидатурах", checked: true },
          { label: "Отчеты по потокам", desc: "Получать сводки о работе кураторов", checked: true },
          { label: "Системные сообщения", desc: "Уведомления о технических обновлениях", checked: false },
          { label: "Напоминания по дедлайнам", desc: "Напоминания о важных сроках", checked: true },
         ].map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-xl border p-4">
           <div>
            <p className="text-sm font-medium">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
           </div>
           <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" defaultChecked={item.checked} className="peer sr-only"/>
            <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5"/>
           </label>
          </div>
         ))}
        </CardContent>
       </Card>
      )
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
      )
     }
    ]}
  />
  </AppShell>
 );
}
