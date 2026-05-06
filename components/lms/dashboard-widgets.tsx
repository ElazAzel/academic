import { ArrowRight, CheckCircle2, Clock, FileText, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export function MetricGrid() {
  const metrics = [
    { label: "Активные курсы", value: "3", tone: "text-primary" },
    { label: "Слушатели", value: "10", tone: "text-emerald-700" },
    { label: "Завершение", value: "42%", tone: "text-amber-700" },
    { label: "Сертификаты", value: "6", tone: "text-sky-700" }
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>{metric.label}</CardDescription>
            <CardTitle className={`text-3xl ${metric.tone}`}>{metric.value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function ContinueLearningCard() {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <Badge className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700">Следующее действие</Badge>
        <CardTitle className="text-xl">Продолжить: AI Strategy Fundamentals</CardTitle>
        <CardDescription>Модуль 1 · Урок 2 · дедлайн через 3 дня</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={45} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">До сертификата осталось пройти 55% курса и сдать финальное задание.</p>
          <Button>
            Открыть урок
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function WorkQueue({ role = "student" }: { role?: "student" | "curator" | "admin" | "observer" }) {
  const items = {
    student: [
      ["Домашнее задание", "Ожидает отправки", FileText],
      ["Ответ куратора", "1 новый ответ", CheckCircle2],
      ["Дедлайн", "Модуль до пятницы", Clock]
    ],
    curator: [
      ["Проверка заданий", "7 работ", FileText],
      ["Вопросы слушателей", "4 новых", Users],
      ["Риски", "3 слушателя", Clock]
    ],
    admin: [
      ["Импорт пользователей", "Готов к проверке", Users],
      ["Аудит", "12 событий за день", ShieldFallback],
      ["Отчёты", "Экспорт CSV", FileText]
    ],
    observer: [
      ["Прогресс проекта", "42% завершено", CheckCircle2],
      ["Сертификаты", "6 выдано", FileText],
      ["Посещаемость", "83% активность", Users]
    ]
  }[role];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Операционная очередь</CardTitle>
        <CardDescription>Короткий список того, что требует внимания сейчас.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map(([title, meta, Icon]) => (
          <div key={title as string} className="flex items-center justify-between rounded-xl border bg-white p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium">{title as string}</p>
                <p className="text-xs text-muted-foreground">{meta as string}</p>
              </div>
            </div>
            <Badge>Открыть</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ShieldFallback(props: { className?: string; "aria-hidden"?: boolean }) {
  return <CheckCircle2 {...props} />;
}

export function CourseGrid() {
  const courses = [
    ["AI Strategy Fundamentals", 45, "Последовательный режим"],
    ["Prompt Engineering for Leaders", 18, "Открытый режим"],
    ["AI Governance and Risk", 0, "Закрытый поток"]
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {courses.map(([title, progress, mode]) => (
        <Card key={title} className="rounded-2xl">
          <CardHeader>
            <Badge className="w-fit">{mode}</Badge>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Курс академии с модулями, заданиями и сертификатом.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">{progress}% завершено</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

