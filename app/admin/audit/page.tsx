import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getAdminAuditPageData } from "@/server/modules/page-data/service";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Search, Activity, ShieldCheck, Users, BookOpen, Award, FileText, Settings, Mail, MessageCircle, HelpCircle, ClipboardCheck } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Аудит безопасности — Администрирование",
  description: "Аудит безопасности и событий.",
};


export const dynamic = "force-dynamic";

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  course: BookOpen,
  lesson: BookOpen,
  module: BookOpen,
  quiz: HelpCircle,
  assignment: ClipboardCheck,
  enrollment: Users,
  certificate: Award,
  user: Users,
  role: ShieldCheck,
  invite: Mail,
  question: HelpCircle,
  notification: MessageCircle,
  settings: Settings,
  audit: FileText,
  progress: Activity,
};

const ACTION_LABELS: Record<string, string> = {
  "course.created": "Создан курс",
  "course.updated": "Курс обновлён",
  "course.deleted": "Курс удалён",
  "lesson.created": "Создан урок",
  "lesson.updated": "Урок обновлён",
  "lesson.blocks.updated": "Блоки урока изменены",
  "module.created": "Создан модуль",
  "module.updated": "Модуль обновлён",
  "enrollment.created": "Зачисление создано",
  "enrollment.deleted": "Зачисление удалено",
  "enrollment.paused": "Обучение приостановлено",
  "enrollment.resumed": "Обучение возобновлено",
  "certificate.issued": "Выдан сертификат",
  "certificate.revoked": "Сертификат отозван",
  "user.created": "Пользователь создан",
  "user.updated": "Пользователь обновлён",
  "user.deleted": "Пользователь удалён",
  "role.assigned": "Роль назначена",
  "quiz.created": "Тест создан",
  "quiz.updated": "Тест обновлён",
  "question.answered": "Ответ на вопрос",
  "question.forwarded": "Вопрос переадресован",
  "assignment.created": "Задание создано",
  "assignment.reviewed": "Задание проверено",
  "progress.lesson_marked": "Прогресс отмечен",
  "settings.updated": "Настройки изменены",
  "curator.assigned": "Куратор назначен",
  "modules.reordered": "Порядок модулей изменён",
  "lesson.question_created": "Задан вопрос",
};

function getActionMeta(action: string) {
  const label = ACTION_LABELS[action] || action;
  const parts = action.split(".");
  const entity = parts[0] || "other";
  const Icon = ACTION_ICONS[entity] || Activity;
  return { label, Icon, entity };
}

export default async function AdminAuditPage(props: {
  searchParams?: Promise<{ page?: string; limit?: string; search?: string }>;
}) {
  await requireRolePage(["admin"]);
  const sp = await props.searchParams;
  const page = Math.max(1, parseInt(sp?.page ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(sp?.limit ?? "25", 10)));
  const search = (sp?.search ?? "").trim().toLowerCase();

  const { logs, total, pages } = await getAdminAuditPageData({ page, limit, search });

  return (
    <AppShell role="admin">
      <PageHeader
        title="Журнал аудита"
        description={`${total} записей — все действия администраторов и системы`}
      />

      <div className="mt-6 space-y-4">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <form>
            <Input
              name="search"
              defaultValue={search}
              placeholder="Поиск по действию, пользователю..."
              className="pl-9 rounded-lg"
            />
          </form>
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          {logs.map((log) => {
            const { label, Icon, entity } = getActionMeta(log.action);
            return (
              <div
                key={log.id}
                className="flex items-start gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{label}</span>
                    <Badge className="text-[10px] uppercase bg-secondary/50">{entity}</Badge>
                    {log.entityId && (
                      <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                        #{log.entityId.slice(0, 8)}
                      </code>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {log.actor ? (
                        <>{log.actor.name || log.actor.email}</>
                      ) : (
                        "Система"
                      )}
                    </span>
                    <span>·</span>
                    <span title={log.createdAt.toISOString()}>
                      {formatDistanceToNow(log.createdAt, { addSuffix: true, locale: ru })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {logs.length === 0 && (
            <div className="py-20 text-center text-muted-foreground">
              <Activity className="mx-auto h-8 w-8 mb-2 opacity-40" />
              {search ? "Ничего не найдено" : "Логов пока нет"}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Показано {logs.length} из {total} · Страница {page} из {pages}
            </p>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Button size="sm" variant="secondary" asChild>
                  <Link href={`/admin/audit?page=${page - 1}&limit=${limit}${search ? `&search=${search}` : ""}`}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Назад
                  </Link>
                </Button>
              )}
              {page < pages && (
                <Button size="sm" variant="secondary" asChild>
                  <Link href={`/admin/audit?page=${page + 1}&limit=${limit}${search ? `&search=${search}` : ""}`}>
                    Вперед
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
