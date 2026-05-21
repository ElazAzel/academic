"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function CuratorAssignmentsFilter({
  initialStatus,
  initialStudent,
}: {
  initialStatus?: string;
  initialStudent?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleStatusChange(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    router.push(`/curator/assignments?${params.toString()}`);
  }

  function handleStudentSearch(student: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (student) {
      params.set("student", student);
    } else {
      params.delete("student");
    }
    router.push(`/curator/assignments?${params.toString()}`);
  }

  return (
    <form className="flex flex-wrap items-center gap-3" onSubmit={(e) => e.preventDefault()}>
      <select
        name="status"
        defaultValue={initialStatus ?? ""}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="h-10 rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-3 font-body-md text-body-md text-m3-on-surface outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all"
      >
        <option value="">Все статусы</option>
        <option value="SUBMITTED">Отправлено</option>
        <option value="IN_REVIEW">На проверке</option>
        <option value="NEEDS_REVISION">На доработку</option>
      </select>

      <input
        name="student"
        defaultValue={initialStudent ?? ""}
        placeholder="Поиск по слушателю..."
        className="h-10 rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-3 font-body-md text-body-md text-m3-on-surface outline-none w-48 focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all placeholder:text-m3-on-surface-variant"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleStudentSearch(e.currentTarget.value);
          }
        }}
      />

      {(initialStatus || initialStudent) && (
        <button
          type="button"
          onClick={() => router.push("/curator/assignments")}
          className="font-body-sm text-body-sm text-m3-primary hover:text-m3-primary/80 underline underline-offset-2 transition-colors"
        >
          Сбросить фильтры
        </button>
      )}
    </form>
  );
}
