import { WorkspacePage } from "@/components/lms/workspace-page";

export default function CertificatesPage() {
  return <WorkspacePage title="Сертификаты" description="Выданные сертификаты, PDF и verification URL." items={["Доступные", "Проверка", "PDF"]} />;
}

