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
import { updateProfileSettingsAction, updatePasswordAction, getAppSettingsAction, updateAppSettingsAction, incrementBuildVersionAction, updateBrandingSettingsAction } from "@/server/actions/settings";
import { TwoFactorSettings } from "@/components/admin/two-factor-settings";
import { BrandMark } from "@/components/layout/brand-mark";
import { resolveBrandingFromSettings } from "@/server/modules/branding/service";

export const metadata = {
  title: "Настройки — Администрирование",
  description: "Настройки платформы.",
};


export const dynamic = "force-dynamic";

const FEATURE_FLAGS = [
  { key: "FEATURE_PUSH_NOTIFICATIONS", label: "Push-уведомления" },
  { key: "FEATURE_GRAPHQL", label: "GraphQL API" },
];

export default async function AdminSettingsPage() {
  await requireRolePage(["admin"]);
  const user = await getCurrentUser();
  const appSettings = await getAppSettingsAction();
  const branding = resolveBrandingFromSettings(appSettings);

 return (
  <AppShell role="admin">
   <PageHeader title="Настройки платформы" description="Бренд, интеграции, уведомления и безопасность."/>
   <Tabs tabs={[
    {
     label: "Профиль",
     content: (
      <form action={updateProfileSettingsAction}>
       <Card className="rounded-lg">
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
            <label htmlFor="name" className="text-sm font-medium">Имя</label>
            <Input id="name" name="name" className="mt-1" defaultValue={user?.name ?? ""}/>
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium">Эл. почта</label>
            <Input id="email" className="mt-1" defaultValue={user?.email} disabled/>
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
      label: "Бренд",
      content: (
       <form action={updateBrandingSettingsAction}>
        <Card className="rounded-lg">
         <CardHeader>
          <div className="flex items-center gap-2">
           <Icon name="palette" className="text-m3-primary" size={20} />
           <CardTitle className="text-headline-sm">Бренд академии</CardTitle>
          </div>
          <CardDescription>
           Эти значения меняют название, логотип, контакт поддержки, манифест приложения и основные цвета интерфейса без пересборки.
          </CardDescription>
         </CardHeader>
         <CardContent className="space-y-6">
          <div className="rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest p-4">
           <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
             <BrandMark branding={branding} size="lg" />
             <div>
              <p className="text-title-lg font-semibold text-m3-on-surface">{branding.name}</p>
              <p className="text-body-sm text-m3-on-surface-variant">{branding.subtitle}</p>
             </div>
            </div>
            <div className="flex flex-wrap gap-2">
             <span className="h-8 w-8 rounded-lg border border-m3-outline-variant" style={{ backgroundColor: branding.primaryColor }} aria-label="Основной цвет" />
             <span className="h-8 w-8 rounded-lg border border-m3-outline-variant" style={{ backgroundColor: branding.accentColor }} aria-label="Акцентный цвет" />
             <span className="h-8 w-8 rounded-lg border border-m3-outline-variant" style={{ backgroundColor: branding.backgroundColor }} aria-label="Фон" />
             <span className="h-8 w-8 rounded-lg border border-m3-outline-variant" style={{ backgroundColor: branding.surfaceColor }} aria-label="Поверхность" />
            </div>
           </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
           <div>
            <label htmlFor="brand_name" className="text-sm font-medium">Название платформы</label>
            <Input id="brand_name" name="brand_name" className="mt-1" defaultValue={branding.name} maxLength={80} required />
           </div>
           <div>
            <label htmlFor="brand_shortName" className="text-sm font-medium">Короткое название</label>
            <Input id="brand_shortName" name="brand_shortName" className="mt-1" defaultValue={branding.shortName} maxLength={32} required />
           </div>
           <div>
            <label htmlFor="brand_subtitle" className="text-sm font-medium">Подзаголовок в шапке</label>
            <Input id="brand_subtitle" name="brand_subtitle" className="mt-1" defaultValue={branding.subtitle} maxLength={80} required />
           </div>
           <div>
            <label htmlFor="brand_supportEmail" className="text-sm font-medium">Email поддержки</label>
            <Input id="brand_supportEmail" name="brand_supportEmail" type="email" className="mt-1" defaultValue={branding.supportEmail} maxLength={120} required />
           </div>
           <div className="lg:col-span-2">
            <label htmlFor="brand_description" className="text-sm font-medium">Описание на экране входа</label>
            <Input id="brand_description" name="brand_description" className="mt-1" defaultValue={branding.description} maxLength={180} required />
           </div>
           <div className="lg:col-span-2">
            <label htmlFor="brand_metadataDescription" className="text-sm font-medium">Описание для браузера и PWA</label>
            <Input id="brand_metadataDescription" name="brand_metadataDescription" className="mt-1" defaultValue={branding.metadataDescription} maxLength={240} required />
           </div>
           <div>
            <label htmlFor="brand_logoIcon" className="text-sm font-medium">Название иконки</label>
            <Input id="brand_logoIcon" name="brand_logoIcon" className="mt-1" defaultValue={branding.logoIcon} maxLength={48} required />
           </div>
           <div>
            <label htmlFor="brand_logoUrl" className="text-sm font-medium">Адрес логотипа</label>
            <Input id="brand_logoUrl" name="brand_logoUrl" className="mt-1" defaultValue={branding.logoUrl} placeholder="/brand/logo.svg" maxLength={500} />
            <p className="mt-1 text-xs text-muted-foreground">Если поле пустое, используется указанная иконка.</p>
           </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
           {[
            ["brand_primaryColor", "Основной цвет", branding.primaryColor],
            ["brand_primaryContainerColor", "Цвет основного контейнера", branding.primaryContainerColor],
            ["brand_accentColor", "Акцентный цвет", branding.accentColor],
            ["brand_accentContainerColor", "Цвет акцентного контейнера", branding.accentContainerColor],
            ["brand_backgroundColor", "Фон приложения", branding.backgroundColor],
            ["brand_surfaceColor", "Поверхности карточек", branding.surfaceColor],
           ].map(([id, label, value]) => (
            <div key={id}>
             <label htmlFor={id} className="text-sm font-medium">{label}</label>
             <div className="mt-1 flex items-center gap-2">
              <Input id={id} name={id} type="color" className="h-10 w-14 shrink-0 p-1" defaultValue={value} required />
              <code className="rounded-md border bg-muted px-2 py-1 font-mono text-xs uppercase text-muted-foreground">{value}</code>
             </div>
            </div>
           ))}
          </div>

          <div className="flex justify-end">
           <Button type="submit">
            <Icon name="save" size={16} className="mr-1.5" />
            Сохранить бренд
           </Button>
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
         <Card className="rounded-lg">
          <CardHeader>
           <CardTitle className="text-headline-sm">Безопасность</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
           <div>
            <label htmlFor="currentPassword" className="text-sm font-medium">Текущий пароль</label>
            <Input id="currentPassword" name="currentPassword" type="password" className="mt-1" placeholder="Текущий пароль" required/>
           </div>
           <div>
            <label htmlFor="newPassword" className="text-sm font-medium">Новый пароль</label>
            <Input id="newPassword" name="newPassword" type="password" className="mt-1" placeholder="Мин. 10 символов" required minLength={10}/>
           </div>
           <div>
            <label htmlFor="confirmPassword" className="text-sm font-medium">Повторите новый пароль</label>
            <Input id="confirmPassword" name="confirmPassword" type="password" className="mt-1" placeholder="Повторите пароль" required/>
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
     label: "Флаги функций",
      content: (
       <form action={updateAppSettingsAction}>
        <Card className="rounded-lg">
         <CardHeader>
          <div className="flex items-center gap-2">
           <Icon name="flag" className="text-m3-primary" size={20} />
           <CardTitle className="text-headline-sm">Флаги функций</CardTitle>
          </div>
          <CardDescription>Включение/отключение функций платформы.</CardDescription>
         </CardHeader>
         <CardContent className="space-y-3">
          {FEATURE_FLAGS.map((f) => (
           <div key={f.key} className="flex items-center justify-between rounded-lg border p-4">
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
        <Card className="rounded-lg">
         <CardHeader>
          <div className="flex items-center gap-2">
           <Icon name="mail" className="text-m3-primary" size={20} />
           <CardTitle className="text-headline-sm">Почта и SMTP</CardTitle>
          </div>
         </CardHeader>
         <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
           <div>
            <label htmlFor="setting_SMTP_HOST" className="text-sm font-medium">SMTP-хост</label>
            <Input
              id="setting_SMTP_HOST"
              name="setting_SMTP_HOST"
              className="mt-1"
              defaultValue={appSettings.SMTP_HOST as string ?? "localhost"}/>
           </div>
           <div>
            <label htmlFor="setting_SMTP_PORT" className="text-sm font-medium">SMTP-порт</label>
            <Input
              id="setting_SMTP_PORT"
              name="setting_SMTP_PORT"
              className="mt-1"
              defaultValue={appSettings.SMTP_PORT as string ?? "1025"}/>
           </div>
           <div className="sm:col-span-2">
            <label htmlFor="setting_SMTP_FROM" className="text-sm font-medium">От кого</label>
            <Input
              id="setting_SMTP_FROM"
              name="setting_SMTP_FROM"
              className="mt-1"
              defaultValue={appSettings.SMTP_FROM as string ?? `${branding.name} <noreply@example.com>`}/>
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
        <Card className="rounded-lg">
         <CardHeader>
          <div className="flex items-center gap-2">
           <Icon name="verified" className="text-m3-primary" size={20} />
           <CardTitle className="text-headline-sm">Параметры сертификации</CardTitle>
          </div>
         </CardHeader>
         <CardContent className="space-y-4">
          <div>
            <label htmlFor="setting_CERTIFICATE_COMPLETION_THRESHOLD" className="text-sm font-medium">Порог завершения для сертификата (%)</label>
            <Input
              id="setting_CERTIFICATE_COMPLETION_THRESHOLD"
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
       <Card className="rounded-lg">
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
         <div className="rounded-lg border bg-m3-surface-container-high px-4 py-3">
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
