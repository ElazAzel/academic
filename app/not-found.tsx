import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-m3-primary/5 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-m3-tertiary/5 blur-3xl" aria-hidden />

      <section className="relative z-10 mx-auto max-w-lg text-center">
        {/* Large 404 */}
        <p className="select-none text-[8rem] font-bold leading-none tracking-tighter text-m3-primary/10 sm:text-[10rem] md:text-[12rem]"
           aria-hidden>
          404
        </p>

        {/* Icon */}
        <div className="mx-auto -mt-12 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-m3-primary-container shadow-sm sm:-mt-16 sm:h-24 sm:w-24">
          <Search className="h-8 w-8 text-m3-on-primary-container sm:h-10 sm:w-10" aria-hidden />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Страница не найдена
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Такой страницы больше нет или адрес изменился.
          <br />
          Проверьте ссылку или вернитесь в кабинет.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/">
              <Home className="h-4 w-4" aria-hidden />
              На главную
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
