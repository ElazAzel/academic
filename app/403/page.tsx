import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-12">
        <Card className="w-full">
          <CardContent className="flex flex-col items-start gap-5 p-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <ShieldAlert className="h-6 w-6 text-destructive" aria-hidden />
            </span>
            <div>
              <h1 className="text-3xl font-semibold">Доступ ограничен</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                У вашей текущей роли нет прав на этот раздел академии.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/student">Вернуться в кабинет</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/login">Войти другим аккаунтом</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
