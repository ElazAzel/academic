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
}: {
  studentId: string;
  cohortId: string;
  curators: { id: string; name: string | null; email: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [selectedCurator, setSelectedCurator] = useState("");

  async function handleAssign() {
    if (!selectedCurator) return;
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
    <div className="flex items-center gap-2">
      <select
        value={selectedCurator}
        onChange={(e) => setSelectedCurator(e.target.value)}
        className="rounded-lg border bg-background px-3 py-1.5 text-sm"
      >
        <option value="">Выбрать куратора</option>
        {curators.map((c) => (
          <option key={c.id} value={c.id}>{c.name ?? c.email}</option>
        ))}
      </select>
      <Button size="sm" onClick={handleAssign} disabled={pending || !selectedCurator}>
        {pending ? "..." : "Назначить"}
      </Button>
    </div>
  );
}