import { SiteHeader } from "@/components/layout/site-header";

export default function TermsPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Пользовательское соглашение</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Доступ к курсам предоставляется академией. Пользователь обязуется соблюдать
          правила обучения, авторские права и требования безопасности.
        </p>
      </main>
    </div>
  );
}

