import Link from "next/link";
import { ShieldAlert, ArrowLeft, LogIn } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getDefaultRolePath } from "@/lib/auth/role-redirect";
import { AUTH_ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Доступ запрещён",
  description: "У вас нет прав для доступа к этой странице.",
};

export const dynamic = "force-dynamic";

export default async function ForbiddenPage() {
  const user = await getCurrentUser();
  const homePath = user ? getDefaultRolePath(user.roles) : AUTH_ROUTES.LOGIN;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-rose-500/5 blur-3xl" aria-hidden />

      <SiteHeader />

      <main className="relative z-10 mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-12">
        <section className="w-full text-center">
          {/* Large 403 */}
          <p className="select-none text-[8rem] font-bold leading-none tracking-tighter text-amber-500/10 sm:text-[10rem]"
             aria-hidden>
            403
          </p>

          {/* Icon */}
          <div className="mx-auto -mt-12 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 shadow-sm sm:-mt-16 sm:h-24 sm:w-24">
            <ShieldAlert className="h-8 w-8 text-amber-600 sm:h-10 sm:w-10" aria-hidden />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Доступ ограничен
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            У вашей текущей роли нет прав на этот раздел академии.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={homePath}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Вернуться в кабинет
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href={AUTH_ROUTES.LOGIN}>
                <LogIn className="h-4 w-4" aria-hidden />
                Войти другим аккаунтом
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
