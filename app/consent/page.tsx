import { SiteHeader } from "@/components/layout/site-header";

export default function ConsentPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Согласие на обработку персональных данных</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Согласие фиксируется в журнале согласий, может быть отозвано и используется
          для прозрачного GDPR-aware и local-law aware процесса.
        </p>
      </main>
    </div>
  );
}

