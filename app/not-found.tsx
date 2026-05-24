import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="max-w-md rounded-lg bg-white p-8 text-center shadow-panel">
        <h1 className="text-2xl font-semibold">Страница не найдена</h1>
        <p className="mt-3 text-sm text-muted-foreground">Проверьте адрес или вернитесь в кабинет.</p>
        <Button asChild className="mt-6">
          <Link href="/">На главную</Link>
        </Button>
      </section>
    </main>
  );
}

