"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

const ERROR_FALLBACK_DESCRIPTION = "Произошла непредвиденная ошибка. Попробуйте обновить страницу.";

export function ErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <Card className="max-w-md rounded-lg border-destructive/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Что-то пошло не так</CardTitle>
          <CardDescription>
            {ERROR_FALLBACK_DESCRIPTION}
          </CardDescription>
          {error.digest && (
            <p className="text-xs text-muted-foreground/70">
              Код ошибки: <code className="font-mono">{error.digest}</code>
            </p>
          )}
        </CardHeader>
        <CardContent className="flex justify-center gap-3">
          {reset && (
            <Button onClick={reset} variant="secondary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Попробовать снова
            </Button>
          )}
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить страницу
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
