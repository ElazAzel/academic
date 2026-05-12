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

export const dynamic = "force-dynamic";

export default async function StudentSettingsPage() {
 await requireRolePage(["student"]);
 const user = await getCurrentUser();

 return (
  <AppShell role="student">
   <PageHeader title="Профиль и настройки" description="Данные профиля, уведомления и безопасность аккаунта."/>
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
           <p className="font-medium">{user?.name ?? "Слушатель"}</p>
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
     label: "Уведомления",
     content: (
      <Card className="rounded-2xl">
       <CardHeader>
        <CardTitle className="text-base">Настройки уведомлений</CardTitle>
        <CardDescription>Выберите, какие уведомления вы хотите получать.</CardDescription>
       </CardHeader>
       <CardContent className="space-y-4">
        {[
         { label: "Ответы куратора", desc: "Получать уведомления об ответах на вопросы", checked: true },
         { label: "Дедлайны модулей", desc: "Напоминания за 3 дня до дедлайна", checked: true },
         { label: "Новые уроки", desc: "Уведомления о добавленных уроках", checked: false },
         { label: "Оценки заданий", desc: "Уведомления при оценке заданий", checked: true },
         { label: "Email-дайджест", desc: "Еженедельная сводка прогресса", checked: false },
        ].map((n) => (
         <div key={n.label} className="flex items-center justify-between rounded-xl border p-4">
          <div>
           <p className="text-sm font-medium">{n.label}</p>
           <p className="text-xs text-muted-foreground">{n.desc}</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
           <input type="checkbox" defaultChecked={n.checked} className="peer sr-only"/>
           <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5"/>
          </label>
         </div>
        ))}
        <p className="text-xs text-muted-foreground">Управление подписками будет доступно после добавления модели предпочтений.</p>
       </CardContent>
      </Card>
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
   ]}/>
  </AppShell>
 );
}
