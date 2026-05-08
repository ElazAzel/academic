"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, GripVertical, Pencil, Trash2, BookOpen, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Lesson {
  id: string;
  title: string;
  type: string;
  order: number;
}

interface Module {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface CurriculumEditorProps {
  courseId: string;
  initialModules: Module[];
}

export function CurriculumEditor({ courseId, initialModules }: CurriculumEditorProps) {
  const [modules, setModules] = useState(initialModules);
  const [showNewModule, setShowNewModule] = useState(false);
  const [activeLessonForm, setActiveLessonForm] = useState<string | null>(null);
  const [pendingModule, setPendingModule] = useState(false);
  const [pendingLesson, setPendingLesson] = useState(false);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDeleteModule(moduleId: string) {
    if (!confirm("Удалить этот модуль со всеми уроками?")) return;
    try {
      const res = await fetch(`/api/v1/modules/${moduleId}`, { method: "DELETE" });
      if (res.ok) {
        setModules(modules.filter((m) => m.id !== moduleId));
        router.refresh();
      }
    } catch {
      alert("Ошибка при удалении");
    }
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!confirm("Удалить этот урок?")) return;
    try {
      const res = await fetch(`/api/v1/lessons/${lessonId}`, { method: "DELETE" });
      if (res.ok) {
        setModules(
          modules.map((m) => ({
            ...m,
            lessons: m.lessons.filter((l) => l.id !== lessonId)
          }))
        );
        router.refresh();
      }
    } catch {
      alert("Ошибка при удалении");
    }
  }

  async function handleAddModule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingModule(true);
    setModuleError(null);

    const formData = new FormData(event.currentTarget);
    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const order = Number(formData.get("order"));
    const recommendedDays = Number(formData.get("recommendedDays"));

    if (!title) {
      setModuleError("Название модуля обязательно");
      setPendingModule(false);
      return;
    }

    try {
      const response = await fetch(`/api/v1/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, order, recommendedDays })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setModuleError(errData.error?.message || "Не удалось создать модуль");
      } else {
        const newModule = await response.json();
        setModules([...modules, { id: newModule.id, title: newModule.title, order: newModule.order, lessons: [] }]);
        setShowNewModule(false);
        setActiveLessonForm(newModule.id);
      }
    } catch {
      setModuleError("Ошибка сети при создании модуля");
    } finally {
      setPendingModule(false);
    }
  }

  async function handleAddLesson(event: React.FormEvent<HTMLFormElement>, moduleId: string) {
    event.preventDefault();
    setPendingLesson(true);
    setLessonError(null);

    const formData = new FormData(event.currentTarget);
    const title = (formData.get("title") as string)?.trim();
    const type = (formData.get("type") as string) || "TEXT";
    const summary = (formData.get("summary") as string)?.trim() || null;
    const contentText = (formData.get("contentText") as string)?.trim() || "";
    const durationMinutes = Number(formData.get("durationMinutes"));
    const order = Number(formData.get("order"));

    if (!title) {
      setLessonError("Название урока обязательно");
      setPendingLesson(false);
      return;
    }

    try {
      const response = await fetch(`/api/v1/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          summary,
          durationMinutes,
          order,
          content: { blocks: [{ type: "paragraph", text: contentText }] }
        })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setLessonError(errData.error?.message || "Не удалось создать урок");
      } else {
        const lesson = await response.json();
        setModules(
          modules.map((m) =>
            m.id === moduleId
              ? { ...m, lessons: [...m.lessons, { id: lesson.id, title: lesson.title, type: lesson.type, order: lesson.order }] }
              : m
          )
        );
        setActiveLessonForm(null);
        router.push(`/instructor/lessons/${lesson.id}/edit`);
      }
    } catch {
      setLessonError("Ошибка сети при создании урока");
    } finally {
      setPendingLesson(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Учебный план</h2>
          <p className="text-sm text-muted-foreground">Работайте с модулями и уроками курса. Добавляйте новые элементы и редактируйте существующие.</p>
        </div>
        <Button variant="secondary" onClick={() => setShowNewModule(!showNewModule)}>
          <Plus className="h-4 w-4 mr-2" />
          {showNewModule ? "Отменить" : "Добавить модуль"}
        </Button>
      </div>

      {showNewModule && (
        <Card className="rounded-3xl border-2 p-6">
          <form onSubmit={handleAddModule} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Название модуля</label>
                <input name="title" type="text" className="w-full rounded-xl border bg-white px-3 py-2 text-sm" placeholder="Название модуля" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Порядок</label>
                <input name="order" type="number" min={1} defaultValue={modules.length + 1} className="w-full rounded-xl border bg-white px-3 py-2 text-sm" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Рекомендовано дней</label>
                <input name="recommendedDays" type="number" min={1} defaultValue={7} className="w-full rounded-xl border bg-white px-3 py-2 text-sm" required />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Описание</label>
              <textarea name="description" className="w-full rounded-2xl border bg-white px-4 py-3 text-sm" placeholder="Краткое описание модуля" />
            </div>

            {moduleError ? <p className="text-sm text-rose-600">{moduleError}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowNewModule(false)} disabled={pendingModule}>Отменить</Button>
              <Button type="submit" disabled={pendingModule}>{pendingModule ? "Создаем..." : "Создать модуль"}</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-6">
        {modules.map((m) => (
          <div key={m.id} className="space-y-4">
            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-2xl border">
              <div className="flex items-center gap-3">
                <GripVertical className="h-5 w-5 text-muted-foreground/50" />
                <span className="text-sm font-bold text-muted-foreground w-6">{m.order}.</span>
                <h3 className="font-semibold">{m.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/instructor/modules/${m.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDeleteModule(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="pl-10 space-y-3">
              {m.lessons.map((l) => (
                <Card key={l.id} className="group transition-shadow hover:shadow-sm">
                  <CardContent className="flex items-center gap-4 py-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground/30" />
                    <span className="text-xs text-muted-foreground w-4">{l.order}.</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      {l.type === "QUIZ" ? <CheckCircle2 className="h-4 w-4 text-primary" /> : l.type === "ASSIGNMENT" ? <FileText className="h-4 w-4 text-primary" /> : <BookOpen className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.title}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{l.type}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/instructor/lessons/${l.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDeleteLesson(l.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="space-y-3">
                {activeLessonForm === m.id ? (
                  <Card className="rounded-3xl border-2 p-4">
                    <form onSubmit={(event) => handleAddLesson(event, m.id)} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Название урока</label>
                          <input name="title" type="text" className="w-full rounded-xl border bg-white px-3 py-2 text-sm" placeholder="Название урока" required />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Тип урока</label>
                          <select name="type" className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                            <option value="VIDEO">Видео</option>
                            <option value="TEXT">Текст</option>
                            <option value="VIDEO_DOCUMENT">Видео + документ</option>
                            <option value="QUIZ">Тест</option>
                            <option value="ASSIGNMENT">Задание</option>
                            <option value="MIXED">Смешанный</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Порядок</label>
                          <input name="order" type="number" min={1} defaultValue={m.lessons.length + 1} className="w-full rounded-xl border bg-white px-3 py-2 text-sm" required />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Длительность</label>
                          <input name="durationMinutes" type="number" min={0} defaultValue={10} className="w-full rounded-xl border bg-white px-3 py-2 text-sm" required />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Краткое описание</label>
                          <input name="summary" type="text" className="w-full rounded-xl border bg-white px-3 py-2 text-sm" placeholder="Описание урока" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Текстовый контент</label>
                        <textarea name="contentText" rows={4} className="w-full rounded-2xl border bg-white px-4 py-3 text-sm" placeholder="Основной текст урока" />
                      </div>

                      {lessonError ? <p className="text-sm text-rose-600">{lessonError}</p> : null}
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => setActiveLessonForm(null)} disabled={pendingLesson}>Отменить</Button>
                        <Button type="submit" disabled={pendingLesson}>{pendingLesson ? "Создание..." : "Создать урок"}</Button>
                      </div>
                    </form>
                  </Card>
                ) : (
                  <Button variant="ghost" size="sm" className="w-full border-2 border-dashed rounded-xl h-12 text-muted-foreground hover:text-primary hover:border-primary/50" onClick={() => setActiveLessonForm(m.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить урок
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
