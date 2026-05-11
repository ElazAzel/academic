"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Archive } from "lucide-react";
import { deleteCohortAction } from "@/server/actions/admin";
import { toast } from "sonner";

export function DeleteCohortButton({ cohortId }: { cohortId: string }) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm("Архивировать этот поток? Слушатели останутся, но поток будет скрыт.")) return;
    setPending(true);
    try {
      await deleteCohortAction(cohortId);
      toast.success("Поток архивирован");
    } catch {
      toast.error("Ошибка при архивации потока");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} disabled={pending} className="text-muted-foreground hover:text-rose-600">
      <Archive className="h-4 w-4" />
    </Button>
  );
}