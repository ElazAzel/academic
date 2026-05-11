"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export function PageError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mb-4 flex justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
            </span>
          </div>
          <CardTitle className="text-xl">Что-то пошло не так</CardTitle>
          <CardDescription>
            Произошла ошибка при загрузке страницы. Пожалуйста, попробуйте снова.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reset} variant="primary">
            Попробовать снова
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
