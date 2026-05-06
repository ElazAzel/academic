import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Flag, Globe, Mail, Shield, Sliders } from "lucide-react";

const FEATURE_FLAGS = [
  { key: "FEATURE_PUSH_NOTIFICATIONS", label: "Push-уведомления", value: false },
  { key: "FEATURE_GRAPHQL", label: "GraphQL API", value: false },
  { key: "FEATURE_TELEGRAM_NOTIFICATIONS", label: "Telegram-уведомления", value: false },
];

export default function AdminSettingsPage() {
  return (
    <AppShell role="admin">
      <PageHeader title="Настройки платформы" description="Feature flags, интеграции, уведомления и безопасность." badge="Администратор" />
      <Tabs tabs={[
        {
          label: "Feature Flags",
          content: (
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-primary" />
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
                      <input type="checkbox" defaultChecked={f.value} className="peer sr-only" />
                      <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          ),
        },
        {
          label: "Уведомления",
          content: (
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Email & SMTP</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">SMTP Host</label>
                    <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue="localhost" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">SMTP Port</label>
                    <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue="1025" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">От кого</label>
                    <input className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" defaultValue="AI Strategic Academy <noreply@example.com>" />
                  </div>
                </div>
                <Button>Сохранить</Button>
              </CardContent>
            </Card>
          ),
        },
        {
          label: "Сертификаты",
          content: (
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Параметры сертификации</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Порог завершения для сертификата (%)</label>
                  <input type="number" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm max-w-[200px]" defaultValue={85} />
                </div>
                <Button>Сохранить</Button>
              </CardContent>
            </Card>
          ),
        },
      ]} />
    </AppShell>
  );
}
