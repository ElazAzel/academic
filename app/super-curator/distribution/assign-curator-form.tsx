"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { assignCuratorFromSupervisorAction } from "@/server/actions/admin";
import { toast } from "sonner";

export function AssignCuratorForm({
  studentId,
  cohortId,
  curators,
  currentCuratorId,
}: {
  studentId: string;
  cohortId: string;
  curators: { id: string; name: string | null; email: string; studentCount?: number }[];
  currentCuratorId?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [selectedCurator, setSelectedCurator] = useState(currentCuratorId ?? "");

  async function handleAssign() {
    if (!selectedCurator || selectedCurator === currentCuratorId) return;
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("studentId", studentId);
      formData.set("curatorId", selectedCurator);
      formData.set("cohortId", cohortId);
      const result = await assignCuratorFromSupervisorAction(formData);
      if (result.success) {
        toast.success("Куратор назначен");
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        value={selectedCurator}
        onChange={(event) => setSelectedCurator(event.target.value)}
        className="min-w-56 rounded-lg border bg-background px-3 py-1.5 text-sm"
      >
        <option value="">Выбрать куратора</option>
        {curators.map((curator) => (
          <option key={curator.id} value={curator.id}>
            {curator.name ?? curator.email}
            {typeof curator.studentCount === "number" ? ` · ${curator.studentCount} слуш.` : ""}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        onClick={handleAssign}
        disabled={pending || !selectedCurator || selectedCurator === currentCuratorId}
      >
        {pending ? "..." : selectedCurator === currentCuratorId ? "Назначен" : "Назначить"}
      </Button>
    </div>
  );
}
