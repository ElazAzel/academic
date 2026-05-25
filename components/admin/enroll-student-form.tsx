"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { enrollStudentAction } from "@/server/actions/admin";

interface EnrollStudentFormProps {
  data: {
    students: { id: string; name: string | null; email: string }[];
    courses: { id: string; title: string }[];
    cohorts: { id: string; name: string; courseId: string }[];
    curators: { id: string; name: string | null; email: string }[];
  };
  onSuccess?: () => void;
}

export function EnrollStudentForm({ data, onSuccess }: EnrollStudentFormProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const formData = new FormData(event.currentTarget);
      const result = await enrollStudentAction(formData);
      if (result.success) {
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setPending(false);
    }
  }

  const filteredCohorts = data.cohorts.filter(c => c.courseId === selectedCourse);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-card p-6 rounded-lg border">
      <h3 className="text-lg font-semibold">Зачислить слушателя</h3>
      
      <div className="space-y-2">
        <label htmlFor="userId" className="text-xs font-medium text-muted-foreground uppercase">Слушатель</label>
        <select id="userId" name="userId" required className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20">
          <option value="">Выберите слушателя...</option>
          {data.students.map(s => (
            <option key={s.id} value={s.id}>{s.name || s.email} ({s.email})</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="courseId" className="text-xs font-medium text-muted-foreground uppercase">Курс</label>
        <select 
          id="courseId"
          name="courseId" 
          required 
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Выберите курс...</option>
          {data.courses.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="cohortId" className="text-xs font-medium text-muted-foreground uppercase">Поток (необязательно)</label>
        <select id="cohortId" name="cohortId" className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20">
          <option value="">Без потока</option>
          {filteredCohorts.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="curatorId" className="text-xs font-medium text-muted-foreground uppercase">Куратор (необязательно)</label>
        <select id="curatorId" name="curatorId" className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20">
          <option value="">Без куратора</option>
          {data.curators.map(c => (
            <option key={c.id} value={c.id}>{c.name || c.email}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Зачисляем..." : "Зачислить"}
      </Button>
    </form>
  );
}
