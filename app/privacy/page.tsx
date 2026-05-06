import { SiteHeader } from "@/components/layout/site-header";

export default function PrivacyPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Политика конфиденциальности</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Платформа обрабатывает персональные данные только для обучения, отчётности,
          сертификатов и соблюдения договорных обязательств академии.
        </p>
      </main>
    </div>
  );
}

