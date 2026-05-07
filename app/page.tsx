import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, ShieldCheck, Users } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  const features = [
    ["Курсы и потоки", "Курс → модуль → урок → прогресс → сертификат", BookOpen],
    ["Кураторский контроль", "Риски, задания, вопросы и SLA ответа", Users],
    ["Отчётность", "Цифровой след для проектов и заказчиков", BarChart3],
    ["Безопасность", "RBAC, аудит, согласия и серверные проверки", ShieldCheck]
  ] as const;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="flex flex-col justify-center">
            <Badge className="mb-5 w-fit border-primary/20 bg-primary/5 text-primary">Закрытая академическая LMS</Badge>
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-normal sm:text-6xl">
              AI Strategic Academy
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Платформа одной академии для курсов, потоков, кураторов, домашних заданий,
              тестов, сертификатов, инвайтов и отчётности без маркетплейсной сложности.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/login">
                  Войти в платформу
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/student">Посмотреть кабинет</Link>
              </Button>
            </div>
          </div>
          <div className="glass-panel rounded-[28px] p-5">
            <div className="rounded-3xl bg-white p-5 shadow-panel">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Операционное состояние</p>
                  <h2 className="text-2xl font-semibold">Поток AI Strategy</h2>
                </div>
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Активен</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {features.map(([title, description, Icon]) => (
                  <Card key={title} className="shadow-none">
                    <CardHeader>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <CardTitle className="text-base">{title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
