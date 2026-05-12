import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { requireRolePage } from "@/lib/auth/page-guards";

export default async function CuratorSettingsPage() {
  await requireRolePage(["curator", "super_curator"]);

  return (
    <AppShell role="curator">
      <PageHeader title="Профиль и настройки" description="Настройки аккаунта и уведомлений куратора."/>
      <Tabs tabs={[
        {
          label: "Профиль",
          content: (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Личные данные</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar name="Куратор" className="h-16 w-16 text-lg"/>
                  <div>
                    <p className="font-medium">Куратор</p>
                    <p className="text-sm text-muted-foreground">curator@academy.local</p>
                  </div>
                </div>
                <Separator/>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Имя</label>
                    <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue="Куратор"/>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue="curator@academy.local" disabled/>
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
                  <Button>Сохранить</Button>
                </div>
              </CardContent>
            </Card>
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
                  { label: "Новые вопросы", desc: "Уведомления о вопросах от слушателей", checked: true },
                  { label: "Задания на проверку", desc: "Уведомления о новых отправках заданий", checked: true },
                  { label: "Риски слушателей", desc: "Оповещения о критических рисках", checked: true },
                  { label: "Напоминания по дедлайнам", desc: "Напоминания о сроках модулей", checked: false },
                  { label: "Системные сообщения", desc: "Уведомления о технических обновлениях", checked: false },
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
          ),
        },
        {
          label: "Безопасность",
          content: (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Безопасность</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Текущий пароль</label>
                  <input type="password" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Текущий пароль"/>
                </div>
                <div>
                  <label className="text-sm font-medium">Новый пароль</label>
                  <input type="password" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Мин. 10 символов"/>
                </div>
                <div>
                  <label className="text-sm font-medium">Повторите новый пароль</label>
                  <input type="password" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Повторите пароль"/>
                </div>
                <div className="flex justify-end">
                  <Button>Изменить пароль</Button>
                </div>
              </CardContent>
            </Card>
          ),
        },
      ]}/>
    </AppShell>
  );
}
