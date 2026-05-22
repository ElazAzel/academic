import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRolePage } from "@/lib/auth/page-guards";
import { UserPlus, Upload, BookOpen, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const TOOLS = [
  {
    title: "Пакетный импорт",
    description: "Загрузите CSV-файл для массового создания пользователей и выдачи доступа.",
    href: "/admin/users",
    icon: Upload,
    action: "Перейти к импорту",
  },
  {
    title: "Зачисления",
    description: "Запишите слушателей на курсы и потоки вручную.",
    href: "/admin/enrollments",
    icon: BookOpen,
    action: "Управлять зачислениями",
  },
  {
    title: "Пользователи",
    description: "Просмотр, редактирование и управление ролями всех пользователей платформы.",
    href: "/admin/users",
    icon: Users,
    action: "Список пользователей",
  },
  {
    title: "Потоки (когорты)",
    description: "Создавайте и управляйте учебными потоками для группового доступа.",
    href: "/admin/cohorts",
    icon: UserPlus,
    action: "Управлять потоками",
  },
];

export default async function AdminInvitesPage() {
  await requireRolePage(["admin"]);

  return (
    <AppShell role="admin">
      <PageHeader
        title="Приглашения и доступ"
        description="AI Strategic Academy работает по приглашениям. Управляйте пользователями и их доступом к курсам."
      />

      <div className="mt-6 space-y-6">
        <Card className="rounded-2xl border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base">О пригласительной модели</CardTitle>
            <CardDescription>
              Самостоятельная регистрация отключена. Все учётные записи создаются администратором.
              Логин и пароль выдаются слушателю лично. Для массового создания используйте
              пакетный импорт пользователей или скрипт <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-mono">npm run users:provision</code>.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map((tool) => (
            <Card key={tool.title} className="rounded-2xl hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{tool.title}</CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </div>
                  <tool.icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant="secondary" size="sm">
                  <Link href={tool.href}>{tool.action}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">CLI-скрипт массового создания</CardTitle>
            <CardDescription>
              Для разовых или автоматизированных операций используйте скрипт provisioning.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="rounded-lg bg-muted p-4 text-sm overflow-x-auto">
              <code>{`# Создать тестовых пользователей (4000 студентов, 50 кураторов и т.д.)
npm run users:provision

# Создать одного пользователя вручную
npx tsx scripts/provision-users.ts --email user@example.com --password Secret123 --role student`}</code>
            </pre>
            <p className="text-xs text-muted-foreground">
              Скрипт использует Argon2id для хеширования паролей. Передавайте credentials слушателям
              защищённым каналом.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
