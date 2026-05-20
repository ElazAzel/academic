"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ActivityFilters({
  days,
  cohortId,
  courseId,
  cohorts,
  courses,
}: {
  days: number;
  cohortId: string | null;
  courseId: string | null;
  cohorts: { id: string; name: string }[];
  courses: { id: string; title: string }[];
}) {
  const router = useRouter();

  function apply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const params = new URLSearchParams();
    const d = (form.elements.namedItem("days") as HTMLSelectElement).value;
    const ch = (form.elements.namedItem("cohortId") as HTMLSelectElement).value;
    const co = (form.elements.namedItem("courseId") as HTMLSelectElement).value;
    if (d) params.set("days", d);
    if (ch) params.set("cohortId", ch);
    if (co) params.set("courseId", co);
    router.push(`/admin/analytics?tab=activity&${params.toString()}`);
  }

  return (
    <form onSubmit={apply} className="flex flex-wrap items-center gap-3 mb-4">
      <select name="days" defaultValue={days} className="rounded-xl border bg-background px-3 py-2 text-sm">
        <option value="7">7 дней</option>
        <option value="30">30 дней</option>
        <option value="90">90 дней</option>
        <option value="180">180 дней</option>
      </select>
      <select name="cohortId" defaultValue={cohortId ?? ""} className="rounded-xl border bg-background px-3 py-2 text-sm">
        <option value="">Все потоки</option>
        {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select name="courseId" defaultValue={courseId ?? ""} className="rounded-xl border bg-background px-3 py-2 text-sm">
        <option value="">Все курсы</option>
        {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
      <Button type="submit" size="sm">Применить</Button>
    </form>
  );
}
