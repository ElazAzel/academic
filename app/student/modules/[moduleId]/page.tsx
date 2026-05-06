import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, BookOpen, CheckCircle2, Lock, PlayCircle } from "lucide-react";

const MOCK_LESSONS = [
  { id: "l1", order: 1, title: "Введение в AI-стратегию", type: "VIDEO", duration: 25, status: "COMPLETED" as const, percent: 100 },
  { id: "l2", order: 2, title: "Ландшафт AI-технологий", type: "VIDEO", duration: 30, status: "COMPLETED" as const, percent: 100 },
  { id: "l3", order: 3, title: "Тест: Основы стратегии", type: "QUIZ", duration: 15, status: "COMPLETED" as const, percent: 100 },
];

const STATUS_ICON = {
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  IN_PROGRESS: <PlayCircle className="h-4 w-4 text-primary" />,
  NOT_STARTED: <BookOpen className="h-4 w-4 text-muted-foreground" />,
  BLOCKED: <Lock className="h-4 w-4 text-muted-foreground/50" />,
};

export default function StudentModulePage({ params }: { params: { moduleId: string } }) {
  return (
    <AppShell role="student">
      <PageHeader title="Модуль 1: Стратегия AI" description="Основы AI-стратегии для бизнес-решений. 3 урока, 7 рекомендуемых дней." badge="Модуль" />
      <div className="space-y-6">
        <Card>
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Прогресс модуля</span>
              <span className="font-medium">100%</span>
            </div>
            <Progress value={100} />
          </CardContent>
        </Card>
        <div className="space-y-2">
          {MOCK_LESSONS.map((l) => (
            <Link key={l.id} href={`/student/lessons/${l.id}`} className="block">
              <Card className="transition-shadow hover:shadow-sm">
                <CardContent className="flex items-center gap-4 py-3">
                  <span className="text-xs text-muted-foreground w-6">{l.order}.</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{l.title}</p>
                    <p className="text-xs text-muted-foreground">{l.type} · {l.duration} мин.</p>
                  </div>
                  {STATUS_ICON[l.status]}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
