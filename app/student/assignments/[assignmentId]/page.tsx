"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Upload } from "lucide-react";
import Link from "next/link";

export default function StudentAssignmentPage({ params }: { params: { assignmentId: string } }) {
  void params;
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 800);
  };

  return (
    <AppShell role="student">
      <div className="mb-4">
        <Link href="/student/my-courses"><Button size="sm" variant="secondary"><ArrowLeft className="h-4 w-4" />Назад к курсу</Button></Link>
      </div>
      <PageHeader title="Практическое задание: План внедрения" description="Подготовьте план внедрения AI для вашей организации." badge="Задание" />
      <div className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Инструкция</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Подготовьте документ с планом внедрения AI в вашей организации. Включите: анализ текущего состояния, предложение 2-3 AI use cases, оценку ROI, roadmap на 6 месяцев, анализ рисков.
            </p>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <Badge className="border-sky-200 bg-sky-50 text-sky-700">2 попытки</Badge>
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">Дедлайн: 20 мая 2026</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Ваш ответ</CardTitle>
            <CardDescription>Введите текст или загрузите файл.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[200px] resize-y"
              placeholder="Введите ваш ответ..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-6">
              <div className="text-center">
                <Upload className="mx-auto h-6 w-6 text-muted-foreground/40 mb-1" />
                <p className="text-xs text-muted-foreground">Загрузить файл (PDF, DOCX)</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button disabled={submitting || !answer.trim()} onClick={handleSubmit}>
                <Send className="h-4 w-4" />
                {submitting ? "Отправка..." : "Отправить"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Статус проверки</CardTitle>
          </CardHeader>
          <CardContent className="py-6 text-center text-muted-foreground">
            <p className="text-sm">Работа ещё не отправлена. Отправьте ответ для проверки куратором.</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
