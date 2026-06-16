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
import fs from "fs";
import path from "path";
import { updateProfileSettingsAction, updatePasswordAction, getAppSettingsAction, updateAppSettingsAction, incrementBuildVersionAction, updateBrandingSettingsAction, updateLegalDocumentAction } from "@/server/actions/settings";
import { TwoFactorSettings } from "@/components/admin/two-factor-settings";
import { resolveBrandingFromSettings } from "@/server/modules/branding/service";
import { BrandSettingsForm } from "@/components/admin/brand-settings-form";
import { LegalDocumentsForm } from "@/components/admin/legal-documents-form";

export const metadata = {
  title: "Настройки — Администрирование",
  description: "Настройки платформы.",
};

export const dynamic = "force-dynamic";

const FEATURE_FLAGS = [
  { key: "FEATURE_PUSH_NOTIFICATIONS", label: "Push-уведомления" },
  { key: "FEATURE_GRAPHQL", label: "GraphQL API" },
  { key: "FEATURE_EMAIL_NOTIFICATIONS", label: "Email-уведомления" },
];

export default async function AdminSettingsPage() {
  await requireRolePage(["admin"]);
  const user = await getCurrentUser();
  const appSettings = (await getAppSettingsAction()) || {};
  const branding = resolveBrandingFromSettings(appSettings);

  const readLegalFile = (filename: string) => {
    try {
      const filePath = path.join(process.cwd(), "docs", "legal", filename);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, "utf-8");
      }
    } catch {}
    return "";
  };

  const privacyFallback = readLegalFile("privacy-policy.md");
  const termsFallback = readLegalFile("terms-of-use.md");
  const cookieFallback = readLegalFile("cookie-notice.md");

  const initialDocs = {
    "privacy-policy": {
      content: (appSettings.LEGAL_CONTENT_PRIVACY_POLICY as string) || privacyFallback,
      version: (appSettings.LEGAL_VERSION_PRIVACY_POLICY as string) || "2026-05-01",
    },
    "terms-of-use": {
      content: (appSettings.LEGAL_CONTENT_TERMS_OF_USE as string) || termsFallback,
      version: (appSettings.LEGAL_VERSION_TERMS_OF_USE as string) || "2026-05-01",
    },
    "cookie-notice": {
      content: (appSettings.LEGAL_CONTENT_COOKIE_NOTICE as string) || cookieFallback,
      version: (appSettings.LEGAL_VERSION_COOKIE_NOTICE as string) || "2026-05-01",
    },
  };

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
        <BrandSettingsForm initialBranding={branding} action={updateBrandingSettingsAction} />
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
        label: "Документы",
        content: (
          <LegalDocumentsForm initialDocs={initialDocs} action={updateLegalDocumentAction} />
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
