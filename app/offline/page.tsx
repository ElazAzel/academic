import { GraduationCap, WifiOff } from "lucide-react";
import Link from "next/link";
import { RetryButton } from "./retry-button";
import { AUTH_ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Нет подключения — AI Strategic Academy",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
          <WifiOff className="h-8 w-8 text-muted-foreground" />
        </span>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Нет подключения</h1>
          <p className="text-sm text-muted-foreground">
            Похоже, вы потеряли соединение с интернетом. 
            Некоторые функции могут быть недоступны, пока соединение не восстановится.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GraduationCap className="h-4 w-4" />
          <span>AI Strategic Academy</span>
        </div>

        <RetryButton />

        <Link
          href={AUTH_ROUTES.LOGIN}
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition"
        >
          Вернуться на страницу входа
        </Link>
      </div>
    </div>
  );
}
